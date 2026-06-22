/**
 * CryptiLink — Settlement Routes
 *
 * Handles incoming settlement batches from merchants.
 *
 * Phase 4 addition: Supports AES-256-GCM encrypted payloads.
 * If the request body has `encrypted: true`, the payload is
 * decrypted before processing. Falls back to plain JSON for
 * backward compatibility with existing tests and Phase 1-3 code.
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { processSettlementBatch } from '../services/settlement';
import { SettlementBatch } from '../types/settlement';

const router = Router();

/**
 * Shared AES-256-GCM key for settlement encryption.
 * PROTOTYPE ONLY — production must derive per-merchant keys.
 * Must match the key in the merchant app's aesEncrypt.ts.
 */
const SETTLEMENT_KEY_HEX =
  'c4a3b2d1e5f6789012345678abcdef01c4a3b2d1e5f6789012345678abcdef01';

/**
 * Decrypts an AES-256-GCM encrypted settlement payload.
 *
 * @param encrypted - The encrypted payload wrapper
 * @returns Decrypted JSON string
 */
function decryptSettlementPayload(encrypted: {
  iv: string;
  tag: string;
  ciphertext: string;
}): string {
  const key = Buffer.from(SETTLEMENT_KEY_HEX, 'hex');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf-8');
}

/**
 * POST /api/v1/settle
 *
 * Submits a settlement batch from a merchant.
 *
 * Request body:
 * {
 *   "merchant_id": "MERCHANT-001",
 *   "transactions": [
 *     {
 *       "wallet_id": "CL-VAULT-<uuid>",
 *       "amount": 150,
 *       "sequence_counter": 1,
 *       "timestamp": 1718800000,
 *       "signature": "<base64 ECDSA signature>"
 *     }
 *   ]
 * }
 *
 * Response: SettlementResponse with per-transaction results
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // ── Phase 4: AES-256-GCM decryption (backward compatible) ─────
    let body = req.body;
    if (body.encrypted === true && body.iv && body.tag && body.ciphertext) {
      try {
        const decryptedJson = decryptSettlementPayload({
          iv: body.iv,
          tag: body.tag,
          ciphertext: body.ciphertext,
        });
        body = JSON.parse(decryptedJson);
      } catch (decryptErr) {
        res.status(400).json({
          error: 'Failed to decrypt settlement payload. Check encryption key and format.',
        });
        return;
      }
    }

    const { merchant_id, transactions } = body;

    // ── Input validation ──────────────────────────────────────────
    if (!merchant_id || typeof merchant_id !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid merchant_id. Provide a string merchant identifier.',
      });
      return;
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({
        error: 'Missing or empty transactions array. Provide at least one transaction.',
      });
      return;
    }

    // Validate each transaction has required fields
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!tx.wallet_id || typeof tx.wallet_id !== 'string') {
        res.status(400).json({
          error: `Transaction ${i}: missing or invalid wallet_id`,
        });
        return;
      }
      if (tx.amount === undefined || typeof tx.amount !== 'number') {
        res.status(400).json({
          error: `Transaction ${i}: missing or invalid amount`,
        });
        return;
      }
      if (tx.sequence_counter === undefined || typeof tx.sequence_counter !== 'number') {
        res.status(400).json({
          error: `Transaction ${i}: missing or invalid sequence_counter`,
        });
        return;
      }
      if (!tx.signature || typeof tx.signature !== 'string') {
        res.status(400).json({
          error: `Transaction ${i}: missing or invalid signature`,
        });
        return;
      }
      if (tx.timestamp === undefined || typeof tx.timestamp !== 'number') {
        res.status(400).json({
          error: `Transaction ${i}: missing or invalid timestamp`,
        });
        return;
      }
    }

    const batch: SettlementBatch = { merchant_id, transactions };
    const result = await processSettlementBatch(batch);

    res.status(200).json(result);
  } catch (err) {
    console.error('[SETTLEMENT ROUTE] Error processing batch:', err);
    res.status(500).json({
      error: 'Internal server error during settlement processing',
    });
  }
});

export default router;
