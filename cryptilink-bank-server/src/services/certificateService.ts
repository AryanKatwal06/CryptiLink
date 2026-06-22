/**
 * CryptiLink — Certificate Issuance Service (Balance Pre-load)
 *
 * Issues a bank-signed certificate when a consumer loads funds into
 * their offline vault. The certificate is the bank's attestation that
 * these funds are escrowed and available for offline spending.
 *
 * CRITICAL BEHAVIORS:
 * 1. Amount must not exceed MAX_OFFLINE_CUMULATIVE (₹500)
 * 2. Liquid balance must be sufficient
 * 3. Funds are atomically moved from liquid → escrow
 * 4. Cumulative exposure is reset to 0 (fresh certificate = fresh spending window)
 * 5. Certificate is signed with canonical JSON for cross-platform verification
 */

import { getClient } from '../db/pool';
import { MAX_OFFLINE_CUMULATIVE, CERTIFICATE_VALIDITY_SECONDS } from '../config';
import { CertificatePayload, SignedCertificate } from '../types/certificate';
import { signCertificate } from '../crypto/signing';

export interface LoadResult {
  certificate: SignedCertificate;
  escrow_amount: number;
  remaining_liquid: number;
}

/**
 * Loads funds into a wallet's offline vault and issues a signed certificate.
 *
 * @param walletId - The wallet to load funds into
 * @param amount - Amount in ₹ to load (must be ≤ MAX_OFFLINE_CUMULATIVE)
 * @returns The signed certificate and updated balances
 */
export async function loadFundsAndIssueCertificate(
  walletId: string,
  amount: number
): Promise<LoadResult> {
  // ── Validate amount against the cumulative cap ──────────────────
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (amount > MAX_OFFLINE_CUMULATIVE) {
    throw new Error(
      `Amount ₹${amount} exceeds the maximum offline cumulative limit of ₹${MAX_OFFLINE_CUMULATIVE}. ` +
      `You cannot load more than ₹${MAX_OFFLINE_CUMULATIVE} into an offline vault at once. ` +
      `This cap exists to limit double-spend exposure in the offline protocol.`
    );
  }

  // ── Use a transaction for atomicity ─────────────────────────────
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock the wallet row to prevent concurrent loads
    const walletResult = await client.query<{
      wallet_id: string;
      public_key: string;
      liquid_balance: string;
      status: string;
    }>(
      'SELECT wallet_id, public_key, liquid_balance, status FROM wallets WHERE wallet_id = $1 FOR UPDATE',
      [walletId]
    );

    if (walletResult.rows.length === 0) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const wallet = walletResult.rows[0];

    if (wallet.status !== 'active') {
      throw new Error(`Wallet ${walletId} is ${wallet.status} — cannot load funds`);
    }

    const currentLiquid = parseFloat(wallet.liquid_balance);
    if (currentLiquid < amount) {
      throw new Error(
        `Insufficient liquid balance: have ₹${currentLiquid}, need ₹${amount}`
      );
    }

    // ── Debit liquid balance ────────────────────────────────────────
    const newLiquid = currentLiquid - amount;
    await client.query(
      'UPDATE wallets SET liquid_balance = $1 WHERE wallet_id = $2',
      [newLiquid, walletId]
    );

    // ── Credit escrow ledger ────────────────────────────────────────
    // Calculate running escrow total for this wallet
    const escrowResult = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM escrow_ledger WHERE wallet_id = $1`,
      [walletId]
    );
    const currentEscrow = parseFloat(escrowResult.rows[0].total);
    const newEscrow = currentEscrow + amount;

    await client.query(
      `INSERT INTO escrow_ledger (wallet_id, amount, running_escrow) VALUES ($1, $2, $3)`,
      [walletId, amount, newEscrow]
    );

    // ── Revoke any existing active certificates for this wallet ─────
    // Only one active certificate per wallet at a time
    await client.query(
      `UPDATE certificates SET revoked = TRUE WHERE wallet_id = $1 AND revoked = FALSE`,
      [walletId]
    );

    // ── Build and sign the certificate ──────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + CERTIFICATE_VALIDITY_SECONDS;

    const payload: CertificatePayload = {
      version: 1,
      wallet_id: walletId,
      public_key: wallet.public_key,
      max_offline_limit: amount,
      expiry: expiry,
    };

    const signedCert = signCertificate(payload);

    // ── Store the certificate ───────────────────────────────────────
    await client.query(
      `INSERT INTO certificates (wallet_id, max_offline_limit, expiry_timestamp, bank_signature)
       VALUES ($1, $2, $3, $4)`,
      [walletId, amount, expiry, signedCert.bank_signature]
    );

    // ── Reset cumulative exposure ───────────────────────────────────
    // A new certificate means a fresh spending window
    await client.query(
      `UPDATE wallet_exposure SET cumulative_exposure = 0, last_sequence_counter = 0, updated_at = NOW()
       WHERE wallet_id = $1`,
      [walletId]
    );

    await client.query('COMMIT');

    return {
      certificate: signedCert,
      escrow_amount: newEscrow,
      remaining_liquid: newLiquid,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
