/**
 * CryptiLink Phase 4 — Transaction Ledger CRUD
 *
 * The merchant's source of truth for "what do I think I'm owed"
 * until settlement confirms or denies each entry.
 *
 * ═══════════════════════════════════════════════════════════════
 * STATUS LIFECYCLE — THE CRITICAL DISTINCTION
 * ═══════════════════════════════════════════════════════════════
 *
 *   OFFLINE_VERIFIED
 *     → Passed all 4 local verification checks
 *     → Bank has NOT confirmed payment
 *     → Merchant CANNOT treat this as settled money
 *     → UI: Amber/indigo badge, "Pending Settlement"
 *
 *   SETTLED
 *     → Bank confirmed payment in settlement batch response
 *     → This is the ONLY state that means "you got paid"
 *     → UI: Green badge, "Confirmed"
 *
 *   SETTLEMENT_REJECTED
 *     → Bank rejected this transaction during settlement
 *     → Reason stored (e.g. EXCEEDS_CUMULATIVE_EXPOSURE_CAP)
 *     → UI: Red badge, "Rejected — [reason]"
 *     → MUST be prominently surfaced, NEVER silently hidden
 *
 * A transaction NEVER goes from SETTLED back to anything else.
 * A transaction NEVER goes from SETTLEMENT_REJECTED back.
 * The only transition is: OFFLINE_VERIFIED → SETTLED | SETTLEMENT_REJECTED
 * ═══════════════════════════════════════════════════════════════
 */

import {
  getDatabase,
  type MerchantTransaction,
  type RejectedTransaction,
  type TransactionStatus,
  type TransportChannel,
} from '../db/MerchantDatabase';

// ═══════════════════════════════════════════════════════════════
// WRITE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Records a verified transaction in the ledger.
 * Initial status is always OFFLINE_VERIFIED.
 *
 * @param tx - Transaction data from the verifier
 * @returns The inserted transaction's ID
 */
export async function recordVerifiedTransaction(txPayload: {
  walletIdHash: string;
  walletId: string | null;
  amount: number;
  sequenceCounter: number;
  signature: string;
  channel: TransportChannel;
  timestamp: number;
  receivedAt: number;
  verificationChecks: string;
}): Promise<number> {
  const db = await getDatabase();
  let insertId = 0;

  await db.transaction((tx) => {
    // 1. Update the replay counter
    tx.executeSql(
      `INSERT OR REPLACE INTO replay_counters (wallet_id_hash, last_sequence)
       VALUES (?, ?)`,
      [txPayload.walletIdHash, txPayload.sequenceCounter],
    );

    // 2. Insert the ledger entry
    tx.executeSql(
      `INSERT INTO merchant_transactions
       (wallet_id_hash, wallet_id, amount, sequence_counter, signature,
        channel, timestamp, received_at, status, verification_checks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OFFLINE_VERIFIED', ?)`,
      [
        txPayload.walletIdHash,
        txPayload.walletId,
        txPayload.amount,
        txPayload.sequenceCounter,
        txPayload.signature,
        txPayload.channel,
        txPayload.timestamp,
        txPayload.receivedAt,
        txPayload.verificationChecks,
      ],
      (_, resultSet) => {
        insertId = resultSet.insertId;
      },
    );
  });

  return insertId;
}

/**
 * Records a REJECTED transaction attempt.
 * Failed verification attempts are NEVER silently discarded.
 */
export async function recordRejectedTransaction(tx: {
  walletIdHash: string;
  amount: number;
  sequenceCounter: number;
  channel: TransportChannel;
  timestamp: number;
  receivedAt: number;
  failedCheck: string;
  rejectionReason: string;
  rawPayload?: string;
}): Promise<number> {
  const db = await getDatabase();
  const [result] = await db.executeSql(
    `INSERT INTO rejected_transactions
     (wallet_id_hash, amount, sequence_counter, channel, timestamp,
      received_at, failed_check, rejection_reason, raw_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.walletIdHash,
      tx.amount,
      tx.sequenceCounter,
      tx.channel,
      tx.timestamp,
      tx.receivedAt,
      tx.failedCheck,
      tx.rejectionReason,
      tx.rawPayload || null,
    ],
  );
  return result.insertId;
}

/**
 * Updates a transaction's status after settlement response.
 *
 * VALID TRANSITIONS ONLY:
 *   OFFLINE_VERIFIED → SETTLED
 *   OFFLINE_VERIFIED → SETTLEMENT_REJECTED
 *
 * @param id - Transaction ID
 * @param newStatus - Target status
 * @param batchId - Settlement batch ID from the bank
 * @param rejectionReason - If SETTLEMENT_REJECTED, the specific reason
 */
export async function updateTransactionStatus(
  id: number,
  newStatus: 'SETTLED' | 'SETTLEMENT_REJECTED',
  batchId: string,
  rejectionReason?: string,
): Promise<void> {
  const db = await getDatabase();

  // Only allow transitions FROM OFFLINE_VERIFIED
  // This prevents accidentally reverting a settled or rejected transaction
  const [result] = await db.executeSql(
    `UPDATE merchant_transactions
     SET status = ?, settlement_batch_id = ?, rejection_reason = ?
     WHERE id = ? AND status = 'OFFLINE_VERIFIED'`,
    [newStatus, batchId, rejectionReason || null, id],
  );

  if (result.rowsAffected === 0) {
    console.warn(
      `[TransactionLedger] updateTransactionStatus: no rows affected for id=${id}. ` +
      `Transaction may already be SETTLED or SETTLEMENT_REJECTED.`,
    );
  }
}

/**
 * Bulk-updates transaction statuses from a settlement batch response.
 * This is called when the bank responds to a settlement batch.
 */
export async function applySettlementResults(
  batchId: string,
  results: Array<{
    transactionId: number;
    accepted: boolean;
    rejectionReason?: string;
  }>,
): Promise<{
  settled: number;
  rejected: number;
  skipped: number;
}> {
  let settled = 0;
  let rejected = 0;
  const skipped = 0;

  for (const result of results) {
    if (result.accepted) {
      await updateTransactionStatus(result.transactionId, 'SETTLED', batchId);
      settled++;
    } else {
      await updateTransactionStatus(
        result.transactionId,
        'SETTLEMENT_REJECTED',
        batchId,
        result.rejectionReason,
      );
      rejected++;
    }
  }

  return { settled, rejected, skipped };
}

// ═══════════════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Gets all transactions with a specific status.
 */
export async function getTransactionsByStatus(
  status: TransactionStatus,
): Promise<MerchantTransaction[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT * FROM merchant_transactions WHERE status = ? ORDER BY received_at DESC`,
    [status],
  );
  return rowsToTransactions(results);
}

/**
 * Gets ALL transactions ordered by received_at descending.
 * Used for the transaction history screen.
 */
export async function getAllTransactions(): Promise<MerchantTransaction[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT * FROM merchant_transactions ORDER BY received_at DESC`,
  );
  return rowsToTransactions(results);
}

/**
 * Gets a single transaction by ID.
 */
export async function getTransactionById(
  id: number,
): Promise<MerchantTransaction | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT * FROM merchant_transactions WHERE id = ?`,
    [id],
  );
  if (results.rows.length === 0) return null;
  return rowToTransaction(results.rows.item(0));
}

/**
 * Gets all pending (OFFLINE_VERIFIED) transactions ready for settlement.
 */
export async function getPendingTransactions(): Promise<MerchantTransaction[]> {
  return getTransactionsByStatus('OFFLINE_VERIFIED');
}

/**
 * Gets all rejected transactions (verification failures).
 */
export async function getRejectedAttempts(): Promise<RejectedTransaction[]> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    `SELECT * FROM rejected_transactions ORDER BY received_at DESC`,
  );
  return rowsToRejected(results);
}

/**
 * Gets summary counts for the dashboard.
 */
export async function getTransactionSummary(): Promise<{
  pending: number;
  settled: number;
  rejected: number;
  pendingAmount: number;
  settledAmount: number;
  rejectedAmount: number;
}> {
  const db = await getDatabase();

  const [pendingResult] = await db.executeSql(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
     FROM merchant_transactions WHERE status = 'OFFLINE_VERIFIED'`,
  );
  const [settledResult] = await db.executeSql(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
     FROM merchant_transactions WHERE status = 'SETTLED'`,
  );
  const [rejectedResult] = await db.executeSql(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
     FROM merchant_transactions WHERE status = 'SETTLEMENT_REJECTED'`,
  );

  return {
    pending: pendingResult.rows.item(0).count,
    settled: settledResult.rows.item(0).count,
    rejected: rejectedResult.rows.item(0).count,
    pendingAmount: pendingResult.rows.item(0).total,
    settledAmount: settledResult.rows.item(0).total,
    rejectedAmount: rejectedResult.rows.item(0).total,
  };
}

// ═══════════════════════════════════════════════════════════════
// ROW MAPPERS
// ═══════════════════════════════════════════════════════════════

function rowToTransaction(row: Record<string, unknown>): MerchantTransaction {
  return {
    id: row.id as number,
    walletIdHash: row.wallet_id_hash as string,
    walletId: row.wallet_id as string | null,
    amount: row.amount as number,
    sequenceCounter: row.sequence_counter as number,
    signature: row.signature as string,
    channel: row.channel as TransportChannel,
    timestamp: row.timestamp as number,
    receivedAt: row.received_at as number,
    status: row.status as TransactionStatus,
    settlementBatchId: row.settlement_batch_id as string | null,
    rejectionReason: row.rejection_reason as string | null,
    verificationChecks: row.verification_checks as string | null,
  };
}

function rowsToTransactions(
  results: { rows: { length: number; item: (i: number) => Record<string, unknown> } },
): MerchantTransaction[] {
  const txs: MerchantTransaction[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    txs.push(rowToTransaction(results.rows.item(i)));
  }
  return txs;
}

function rowsToRejected(
  results: { rows: { length: number; item: (i: number) => Record<string, unknown> } },
): RejectedTransaction[] {
  const txs: RejectedTransaction[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    txs.push({
      id: row.id as number,
      walletIdHash: row.wallet_id_hash as string,
      amount: row.amount as number,
      sequenceCounter: row.sequence_counter as number,
      channel: row.channel as TransportChannel,
      timestamp: row.timestamp as number,
      receivedAt: row.received_at as number,
      failedCheck: row.failed_check as string,
      rejectionReason: row.rejection_reason as string,
      rawPayload: row.raw_payload as string | null,
    });
  }
  return txs;
}
