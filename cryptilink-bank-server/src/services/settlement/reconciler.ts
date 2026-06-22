/**
 * CryptiLink — Settlement Reconciler
 *
 * Processes settlement batches from merchants. Each batch contains
 * multiple transactions that are validated and settled individually.
 *
 * CRITICAL CONCURRENCY CONTROL:
 * Uses row-level locking (SELECT ... FOR UPDATE) on the wallet_exposure
 * table to prevent race conditions when two settlement batches for the
 * same wallet arrive concurrently. Without this lock, two concurrent
 * batches could both read the same cumulative_exposure, both pass the
 * cap check, and effectively double-spend beyond the cap.
 */

import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../../db/pool';
import {
  SettlementBatch,
  SettlementResponse,
  TransactionResult,
} from '../../types/settlement';
import { validateTransaction, ValidationContext } from './validator';

/**
 * Processes a complete settlement batch from a merchant.
 *
 * For each transaction:
 * 1. Acquires a row-level lock on the wallet's exposure record
 * 2. Loads the wallet's current state (exposure, sequence, certificate)
 * 3. Runs the validation pipeline
 * 4. If valid: atomically updates exposure, sequence, and escrow
 * 5. If invalid: records the rejection reason
 * 6. ONE BAD TX DOES NOT HALT THE BATCH — processing continues
 *
 * @param batch - The settlement batch from the merchant
 * @returns Per-transaction results with accept/reject + reason
 */
export async function processSettlementBatch(
  batch: SettlementBatch
): Promise<SettlementResponse> {
  const batchId = uuidv4();
  const client = await getClient();
  const results: TransactionResult[] = [];

  try {
    await client.query('BEGIN');

    // ── Create the batch record ─────────────────────────────────────
    await client.query(
      `INSERT INTO settlement_batches (batch_id, merchant_id, status)
       VALUES ($1, $2, 'processing')`,
      [batchId, batch.merchant_id]
    );

    // ── Process each transaction individually ───────────────────────
    for (let i = 0; i < batch.transactions.length; i++) {
      const tx = batch.transactions[i];

      try {
        // Look up the wallet
        const walletResult = await client.query<{
          wallet_id: string;
          public_key: string;
          status: string;
        }>(
          'SELECT wallet_id, public_key, status FROM wallets WHERE wallet_id = $1',
          [tx.wallet_id]
        );

        if (walletResult.rows.length === 0) {
          results.push({
            index: i,
            wallet_id: tx.wallet_id,
            accepted: false,
            rejected_reason: 'WALLET_NOT_FOUND',
            settled_amount: 0,
          });

          // Record the rejected transaction
          await client.query(
            `INSERT INTO settled_transactions
             (batch_id, wallet_id, amount, sequence_counter, consumer_signature, timestamp, verified, rejected_reason)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
            [batchId, tx.wallet_id, tx.amount, tx.sequence_counter, tx.signature, tx.timestamp, 'WALLET_NOT_FOUND']
          );
          continue;
        }

        const wallet = walletResult.rows[0];

        if (wallet.status !== 'active') {
          results.push({
            index: i,
            wallet_id: tx.wallet_id,
            accepted: false,
            rejected_reason: 'WALLET_SUSPENDED',
            settled_amount: 0,
          });
          await client.query(
            `INSERT INTO settled_transactions
             (batch_id, wallet_id, amount, sequence_counter, consumer_signature, timestamp, verified, rejected_reason)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
            [batchId, tx.wallet_id, tx.amount, tx.sequence_counter, tx.signature, tx.timestamp, 'WALLET_SUSPENDED']
          );
          continue;
        }

        // ── ROW-LEVEL LOCK on wallet_exposure ─────────────────────────
        // This is critical: SELECT ... FOR UPDATE prevents concurrent
        // settlement batches from reading stale exposure values.
        const exposureResult = await client.query<{
          cumulative_exposure: string;
          last_sequence_counter: number;
        }>(
          'SELECT cumulative_exposure, last_sequence_counter FROM wallet_exposure WHERE wallet_id = $1 FOR UPDATE',
          [tx.wallet_id]
        );

        if (exposureResult.rows.length === 0) {
          results.push({
            index: i,
            wallet_id: tx.wallet_id,
            accepted: false,
            rejected_reason: 'WALLET_NOT_FOUND',
            settled_amount: 0,
          });
          await client.query(
            `INSERT INTO settled_transactions
             (batch_id, wallet_id, amount, sequence_counter, consumer_signature, timestamp, verified, rejected_reason)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
            [batchId, tx.wallet_id, tx.amount, tx.sequence_counter, tx.signature, tx.timestamp, 'WALLET_NOT_FOUND']
          );
          continue;
        }

        const exposure = exposureResult.rows[0];

        // ── Load the wallet's active (non-revoked, non-expired) certificate
        const certResult = await client.query<{
          expiry_timestamp: string;
          revoked: boolean;
        }>(
          `SELECT expiry_timestamp, revoked FROM certificates
           WHERE wallet_id = $1 AND revoked = FALSE
           ORDER BY issued_at DESC LIMIT 1`,
          [tx.wallet_id]
        );

        if (certResult.rows.length === 0) {
          results.push({
            index: i,
            wallet_id: tx.wallet_id,
            accepted: false,
            rejected_reason: 'CERTIFICATE_NOT_FOUND',
            settled_amount: 0,
          });
          await client.query(
            `INSERT INTO settled_transactions
             (batch_id, wallet_id, amount, sequence_counter, consumer_signature, timestamp, verified, rejected_reason)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
            [batchId, tx.wallet_id, tx.amount, tx.sequence_counter, tx.signature, tx.timestamp, 'CERTIFICATE_NOT_FOUND']
          );
          continue;
        }

        const cert = certResult.rows[0];

        // ── Build validation context and run the pipeline ─────────────
        const ctx: ValidationContext = {
          walletPublicKey: wallet.public_key,
          currentExposure: parseFloat(exposure.cumulative_exposure),
          lastSequenceCounter: exposure.last_sequence_counter,
          certificateExpiry: parseInt(cert.expiry_timestamp, 10),
          certificateRevoked: cert.revoked,
        };

        const validationResult = validateTransaction(tx, ctx);

        if (!validationResult.valid) {
          results.push({
            index: i,
            wallet_id: tx.wallet_id,
            accepted: false,
            rejected_reason: validationResult.reason,
            settled_amount: 0,
          });
          await client.query(
            `INSERT INTO settled_transactions
             (batch_id, wallet_id, amount, sequence_counter, consumer_signature, timestamp, verified, rejected_reason)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
            [batchId, tx.wallet_id, tx.amount, tx.sequence_counter, tx.signature, tx.timestamp, validationResult.reason]
          );
          continue;
        }

        // ── All checks passed — settle the transaction ────────────────
        // Update cumulative exposure
        const newExposure = parseFloat(exposure.cumulative_exposure) + tx.amount;
        await client.query(
          `UPDATE wallet_exposure
           SET cumulative_exposure = $1, last_sequence_counter = $2, updated_at = NOW()
           WHERE wallet_id = $3`,
          [newExposure, tx.sequence_counter, tx.wallet_id]
        );

        // Move funds from escrow to merchant (deduct from escrow)
        // In a real system, we'd credit a merchant_settlements table.
        // For the prototype, we just deduct from escrow.
        await client.query(
          `INSERT INTO escrow_ledger (wallet_id, amount, running_escrow)
           VALUES ($1, $2,
             (SELECT COALESCE(
               (SELECT running_escrow FROM escrow_ledger WHERE wallet_id = $1 ORDER BY entry_id DESC LIMIT 1),
               0
             ) - $3))`,
          [tx.wallet_id, -tx.amount, tx.amount]
        );

        // Record the verified transaction
        await client.query(
          `INSERT INTO settled_transactions
           (batch_id, wallet_id, amount, sequence_counter, consumer_signature, timestamp, verified, rejected_reason)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, NULL)`,
          [batchId, tx.wallet_id, tx.amount, tx.sequence_counter, tx.signature, tx.timestamp]
        );

        results.push({
          index: i,
          wallet_id: tx.wallet_id,
          accepted: true,
          settled_amount: tx.amount,
        });
      } catch (txErr) {
        // Individual transaction errors shouldn't halt the batch
        console.error(`[SETTLEMENT] Error processing tx ${i} in batch ${batchId}:`, txErr);
        results.push({
          index: i,
          wallet_id: tx.wallet_id,
          accepted: false,
          rejected_reason: 'WALLET_NOT_FOUND', // Generic fallback for unexpected errors
          settled_amount: 0,
        });
      }
    }

    // ── Update batch status ─────────────────────────────────────────
    await client.query(
      `UPDATE settlement_batches SET status = 'completed' WHERE batch_id = $1`,
      [batchId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // ── Build summary ─────────────────────────────────────────────────
  const accepted = results.filter(r => r.accepted);
  const rejected = results.filter(r => !r.accepted);

  return {
    batch_id: batchId,
    merchant_id: batch.merchant_id,
    results,
    summary: {
      total: results.length,
      accepted: accepted.length,
      rejected: rejected.length,
      total_settled_amount: accepted.reduce((sum, r) => sum + r.settled_amount, 0),
    },
  };
}
