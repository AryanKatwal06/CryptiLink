/**
 * CryptiLink Phase 4 — Offline 4-Check Verifier
 *
 * The merchant-side verification engine that runs ENTIRELY OFFLINE
 * with NO network calls. This is the core security logic of Phase 4.
 *
 * ═══════════════════════════════════════════════════════════════
 * THE 4 CHECKS (run in order, fail fast)
 * ═══════════════════════════════════════════════════════════════
 *
 * Check 1 — BANK CERTIFICATE SIGNATURE
 *   Verify the cached certificate's bank_signature against the
 *   bank's public key. Proves the bank actually issued this cert.
 *
 * Check 2 — CERTIFICATE EXPIRY
 *   Reject if certificate.expiry < now. Prevents stale certificates
 *   from being used indefinitely.
 *
 * Check 3 — SEQUENCE / REPLAY
 *   Query local SQLCipher for last_sequence for this wallet_id_hash.
 *   Reject if incoming sequence_counter <= last_sequence.
 *   This catches replays against THIS merchant only.
 *   Cross-merchant replay detection happens at the bank during settlement.
 *
 * Check 4 — TRANSACTION SIGNATURE
 *   Verify the compact payload's ECDSA signature over the 20-byte
 *   data portion using the consumer's public key from the certificate.
 *   This proves the consumer authorized THIS specific amount.
 *
 * ═══════════════════════════════════════════════════════════════
 * CRITICAL SECURITY NOTE
 * ═══════════════════════════════════════════════════════════════
 *
 * Passing ALL 4 checks means the transaction is cryptographically
 * AUTHENTIC and not a replay against THIS merchant. It does NOT mean
 * the bank has confirmed payment. The consumer could have already
 * spent past their cap at a DIFFERENT offline merchant.
 *
 * The result status is OFFLINE_VERIFIED (amber), NOT SETTLED (green).
 * This distinction is THE ENTIRE POINT of Phase 4.
 */

import type { SignedCertificate } from './CertSyncService';
import { lookupCertificate } from './CertSyncService';
import { getCachedBankPublicKey } from './MerchantOnboarding';
import { getLastSequence, updateLastSequence } from '../db/MerchantDatabase';
import {
  verifyEcdsaSignature,
  canonicalizeCertificate,
  derToRaw,
  extractRawPublicKey,
  serializePayloadData,
  base64ToBytes,
  stringToBytes,
} from '../crypto/ecdsaVerify';
import type { IncomingPayload } from './TransactionReceiver';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Result of a single verification check */
export interface CheckResult {
  /** Which check this is (1-4) */
  checkNumber: number;
  /** Human-readable name of the check */
  checkName: string;
  /** Whether this check passed */
  passed: boolean;
  /** Detail message (especially on failure) */
  detail: string;
  /** How long this check took (ms) */
  durationMs: number;
}

/** Complete verification result */
export interface VerificationResult {
  /** Whether ALL 4 checks passed */
  passed: boolean;
  /** Individual results for each check that was run */
  checks: CheckResult[];
  /** If failed, which check number failed first */
  failedCheck?: number;
  /** If failed, the rejection reason (matches Phase 1's RejectionReason type) */
  rejectionReason?: string;
  /** The resolved certificate (if check 1 passed) */
  certificate?: SignedCertificate;
  /** Total verification time (ms) */
  totalDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN VERIFIER
// ═══════════════════════════════════════════════════════════════

/**
 * Runs the full offline 4-check verification pipeline on an incoming
 * transaction payload.
 *
 * The checks run sequentially and fail fast — if check N fails,
 * checks N+1 through 4 are not attempted.
 *
 * ALL 4 checks run fully offline. No network calls.
 *
 * @param payload - The deserialized compact payload from SMS or acoustic
 * @returns Complete verification result with per-check details
 */
export async function verifyTransaction(
  payload: IncomingPayload,
): Promise<VerificationResult> {
  const startTime = Date.now();
  const checks: CheckResult[] = [];

  // ── Resolve the certificate for this wallet ─────────────────────
  const certLookup = await lookupCertificate(payload.walletIdHash);
  if (!certLookup.found || !certLookup.certificate) {
    return {
      passed: false,
      checks: [{
        checkNumber: 0,
        checkName: 'Certificate Lookup',
        passed: false,
        detail: `No certificate cached for wallet_id_hash: ${payload.walletIdHash}. ` +
                `Cannot verify without the consumer's certificate.`,
        durationMs: Date.now() - startTime,
      }],
      failedCheck: 0,
      rejectionReason: 'CERTIFICATE_NOT_FOUND',
      totalDurationMs: Date.now() - startTime,
    };
  }

  const certificate = certLookup.certificate;

  // ── CHECK 1: Bank Certificate Signature ─────────────────────────
  const check1Result = await runCheck1_CertSignature(certificate);
  checks.push(check1Result);
  if (!check1Result.passed) {
    return buildResult(false, checks, 1, 'INVALID_BANK_SIGNATURE', startTime);
  }

  // ── CHECK 2: Certificate Expiry ─────────────────────────────────
  const check2Result = runCheck2_Expiry(certificate);
  checks.push(check2Result);
  if (!check2Result.passed) {
    return buildResult(false, checks, 2, 'CERTIFICATE_EXPIRED', startTime, certificate);
  }

  // ── CHECK 3: Sequence / Replay ──────────────────────────────────
  const check3Result = await runCheck3_Replay(payload);
  checks.push(check3Result);
  if (!check3Result.passed) {
    return buildResult(false, checks, 3, 'REPLAY_ATTACK_DETECTED', startTime, certificate);
  }

  // ── CHECK 4: Transaction Signature ──────────────────────────────
  const check4Result = await runCheck4_TransactionSignature(payload, certificate);
  checks.push(check4Result);
  if (!check4Result.passed) {
    return buildResult(false, checks, 4, 'INVALID_SIGNATURE', startTime, certificate);
  }

  // ── ALL CHECKS PASSED ──────────────────────────────────────────
  // Update the local replay counter ONLY after all checks pass
  await updateLastSequence(payload.walletIdHash, payload.sequenceCounter);

  return buildResult(true, checks, undefined, undefined, startTime, certificate);
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * Check 1 — Bank Certificate Signature Validity
 *
 * Verifies that the cached certificate was actually signed by the
 * bank's ECDSA private key. This proves the bank issued this cert.
 */
async function runCheck1_CertSignature(
  cert: SignedCertificate,
): Promise<CheckResult> {
  const start = Date.now();
  const checkName = 'Bank Certificate Signature';

  try {
    // Get the bank's public key (cached from onboarding)
    const bankPublicKeyPem = await getCachedBankPublicKey();
    if (!bankPublicKeyPem) {
      return {
        checkNumber: 1,
        checkName,
        passed: false,
        detail: 'Bank public key not cached. Complete merchant onboarding first.',
        durationMs: Date.now() - start,
      };
    }

    // Extract raw public key from PEM
    // PEM → DER (strip headers and decode base64) → raw key
    const pemBody = bankPublicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    const bankRawKey = extractRawPublicKey(pemBody);

    // Canonicalize the certificate (same as Phase 1)
    const canonicalJson = canonicalizeCertificate(cert);
    const messageBytes = stringToBytes(canonicalJson);

    // The bank's signature is DER-encoded — convert to raw (r‖s)
    const rawSignature = derToRaw(cert.bank_signature);

    // Verify
    const isValid = await verifyEcdsaSignature(messageBytes, rawSignature, bankRawKey);

    return {
      checkNumber: 1,
      checkName,
      passed: isValid,
      detail: isValid
        ? 'Certificate signature verified — bank issued this certificate'
        : 'Certificate signature INVALID — possible forgery or corruption',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      checkNumber: 1,
      checkName,
      passed: false,
      detail: `Signature verification error: ${err instanceof Error ? err.message : 'unknown'}`,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Check 2 — Certificate Expiry
 *
 * Rejects if the certificate's expiry timestamp has passed.
 * Uses the device's local clock — no NTP or network sync.
 */
function runCheck2_Expiry(cert: SignedCertificate): CheckResult {
  const start = Date.now();
  const checkName = 'Certificate Expiry';
  const now = Math.floor(Date.now() / 1000);

  const isExpired = cert.expiry < now;
  const expiryDate = new Date(cert.expiry * 1000).toISOString();

  return {
    checkNumber: 2,
    checkName,
    passed: !isExpired,
    detail: isExpired
      ? `Certificate EXPIRED at ${expiryDate} (${now - cert.expiry}s ago)`
      : `Certificate valid until ${expiryDate} (${cert.expiry - now}s remaining)`,
    durationMs: Date.now() - start,
  };
}

/**
 * Check 3 — Sequence Counter / Replay Detection
 *
 * Queries the local SQLCipher replay_counters table for the last
 * seen sequence counter for this wallet_id_hash.
 *
 * IMPORTANT: This check only catches replays against THIS merchant.
 * A consumer could replay the same transaction at a DIFFERENT offline
 * merchant, and both merchants would independently pass this check.
 * The cross-merchant replay detection happens at the bank during
 * settlement (Phase 1's sequence counter check).
 */
async function runCheck3_Replay(
  payload: IncomingPayload,
): Promise<CheckResult> {
  const start = Date.now();
  const checkName = 'Sequence / Replay Check';

  try {
    const lastSequence = await getLastSequence(payload.walletIdHash);

    if (payload.sequenceCounter <= lastSequence) {
      return {
        checkNumber: 3,
        checkName,
        passed: false,
        detail: `REPLAY DETECTED: incoming sequence ${payload.sequenceCounter} ` +
                `<= last seen ${lastSequence} for this wallet at this merchant`,
        durationMs: Date.now() - start,
      };
    }

    return {
      checkNumber: 3,
      checkName,
      passed: true,
      detail: `Sequence ${payload.sequenceCounter} > last seen ${lastSequence} — ` +
              `not a replay (at this merchant)`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      checkNumber: 3,
      checkName,
      passed: false,
      detail: `Replay check error: ${err instanceof Error ? err.message : 'unknown'}`,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Check 4 — Transaction Signature
 *
 * Verifies the consumer's ECDSA signature over the compact payload's
 * 20-byte data portion using the consumer's public key from the
 * cached certificate.
 *
 * This is what proves the consumer actually authorized THIS specific
 * amount at THIS time — not just that they have a valid certificate.
 */
async function runCheck4_TransactionSignature(
  payload: IncomingPayload,
  cert: SignedCertificate,
): Promise<CheckResult> {
  const start = Date.now();
  const checkName = 'Transaction Signature';

  try {
    // Reconstruct the signed 20-byte data portion
    const dataBytes = serializePayloadData(
      payload.walletIdHash,
      payload.amount,
      payload.sequenceCounter,
      payload.timestamp,
    );

    // The payload signature is raw (r‖s), base64-encoded
    const signatureBytes = base64ToBytes(payload.signature);
    if (signatureBytes.length !== 64) {
      return {
        checkNumber: 4,
        checkName,
        passed: false,
        detail: `Invalid signature length: ${signatureBytes.length} bytes (expected 64)`,
        durationMs: Date.now() - start,
      };
    }

    // Extract the consumer's raw public key from their certificate
    const consumerRawKey = extractRawPublicKey(cert.public_key);

    // Verify
    const isValid = await verifyEcdsaSignature(dataBytes, signatureBytes, consumerRawKey);

    return {
      checkNumber: 4,
      checkName,
      passed: isValid,
      detail: isValid
        ? `Consumer authorized ₹${payload.amount} — signature valid`
        : 'Transaction signature INVALID — consumer did not authorize this amount',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      checkNumber: 4,
      checkName,
      passed: false,
      detail: `Signature check error: ${err instanceof Error ? err.message : 'unknown'}`,
      durationMs: Date.now() - start,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function buildResult(
  passed: boolean,
  checks: CheckResult[],
  failedCheck?: number,
  rejectionReason?: string,
  startTime?: number,
  certificate?: SignedCertificate,
): VerificationResult {
  return {
    passed,
    checks,
    failedCheck,
    rejectionReason,
    certificate,
    totalDurationMs: Date.now() - (startTime || Date.now()),
  };
}
