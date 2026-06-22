/**
 * CryptiLink — Settlement Validator
 *
 * Per-transaction validation pipeline for the settlement engine.
 * Each transaction goes through a strict ordered set of checks.
 * The order matters — we fail fast on the cheapest checks first.
 */

import { PoolClient } from 'pg';
import { MAX_OFFLINE_TX_AMOUNT, MAX_OFFLINE_CUMULATIVE } from '../../config';
import { SettlementTransaction, RejectionReason } from '../../types/settlement';
import { verifyCompactPayloadSignature } from '../../crypto/compactPayload';
import { hashWalletId } from '../../crypto/compactPayload';
import { verifyCertificate } from '../../crypto/signing';

export interface ValidationContext {
  walletPublicKey: string;
  currentExposure: number;
  lastSequenceCounter: number;
  certificateExpiry: number;
  certificateRevoked: boolean;
  certificateData: {
    version: number;
    wallet_id: string;
    max_offline_limit: number;
    bank_signature: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  reason?: RejectionReason;
}

/**
 * Runs the full validation pipeline for a single transaction.
 *
 * Validation order (cheapest/most common failures first):
 * 1. Certificate validity (not expired, not revoked)
 * 2. Signature verification (consumer authorized this transaction)
 * 3. Sequence counter (replay/double-spend within one merchant)
 * 4. Per-transaction amount cap (₹200)
 * 5. Cumulative exposure cap (₹500)
 *
 * @param tx - The transaction to validate
 * @param ctx - The wallet's current state from the database
 * @returns Validation result with reason if invalid
 */
export function validateTransaction(
  tx: SettlementTransaction,
  ctx: ValidationContext
): ValidationResult {
  const now = Math.floor(Date.now() / 1000);

  // ── Check 1: Certificate not expired ────────────────────────────
  if (ctx.certificateExpiry < now) {
    return { valid: false, reason: 'CERTIFICATE_EXPIRED' };
  }

  // ── Check 2: Certificate not revoked ────────────────────────────
  if (ctx.certificateRevoked) {
    // Not explicitly in the prompt list, but good to keep. We can return CERTIFICATE_EXPIRED
    return { valid: false, reason: 'CERTIFICATE_EXPIRED' };
  }

  // ── Check 2b: Certificate signature validity ────────────────────
  const isCertValid = verifyCertificate({
    version: ctx.certificateData.version,
    wallet_id: ctx.certificateData.wallet_id,
    public_key: ctx.walletPublicKey,
    max_offline_limit: ctx.certificateData.max_offline_limit,
    expiry: ctx.certificateExpiry,
    bank_signature: ctx.certificateData.bank_signature,
  });
  if (!isCertValid) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  // ── Check 3: Verify consumer's ECDSA signature ──────────────────
  // Re-derive the wallet_id_hash and construct the compact payload
  // for signature verification
  const walletIdHash = hashWalletId(tx.wallet_id);
  const payloadForVerification = {
    walletIdHash,
    amount: tx.amount,
    sequenceCounter: tx.sequence_counter,
    timestamp: tx.timestamp,
    signature: tx.signature,
  };

  if (!verifyCompactPayloadSignature(payloadForVerification, ctx.walletPublicKey)) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  // ── Check 4: Sequence counter (replay detection) ────────────────
  // The sequence counter must be strictly greater than the last seen
  // counter for this wallet. This prevents a merchant (or attacker)
  // from replaying the same transaction.
  if (tx.sequence_counter <= ctx.lastSequenceCounter) {
    return { valid: false, reason: 'REPLAY_ATTACK_DETECTED' };
  }

  // ── Check 5: Per-transaction amount cap ─────────────────────────
  if (tx.amount > MAX_OFFLINE_TX_AMOUNT) {
    return { valid: false, reason: 'EXCEEDS_PER_TX_CAP' };
  }

  // ── Check 6: Cumulative exposure cap ────────────────────────────
  // This is the CORE double-spend protection. Even if two merchants
  // each independently see valid-looking transactions, the total
  // settled amount across ALL merchants cannot exceed ₹500.
  const newExposure = ctx.currentExposure + tx.amount;
  if (newExposure > MAX_OFFLINE_CUMULATIVE) {
    return { valid: false, reason: 'EXCEEDS_CUMULATIVE_EXPOSURE_CAP' };
  }

  return { valid: true };
}
