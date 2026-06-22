/**
 * CryptiLink — Wallet Registration Service
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { WALLET_ID_PREFIX, ECDSA_CURVE, INITIAL_LIQUID_BALANCE } from '../config';

export interface WalletRegistrationResult {
  wallet_id: string;
  status: string;
  created_at: Date;
}

/**
 * Validates that a base64-encoded public key is a well-formed ECDSA key
 * on the prime256v1 (secp256r1 / P-256) curve.
 *
 * We validate by attempting to create a KeyObject from the DER bytes.
 * If the key is on the wrong curve or malformed, this will throw.
 *
 * @param publicKeyBase64 - Base64-encoded SPKI DER public key
 * @throws Error if the key is invalid or on the wrong curve
 */
export function validateConsumerPublicKey(publicKeyBase64: string): void {
  let keyObject: crypto.KeyObject;

  try {
    const derBytes = Buffer.from(publicKeyBase64, 'base64');
    keyObject = crypto.createPublicKey({
      key: derBytes,
      type: 'spki',
      format: 'der',
    });
  } catch (err) {
    throw new Error(
      'Invalid public key: could not parse as SPKI DER. ' +
      'Ensure the key is base64-encoded and in SPKI format.'
    );
  }

  // Verify it's an EC key (not RSA, Ed25519, etc.)
  if (keyObject.asymmetricKeyType !== 'ec') {
    throw new Error(
      `Invalid key type: expected EC (ECDSA), got ${keyObject.asymmetricKeyType}. ` +
      `CryptiLink requires prime256v1 (secp256r1 / P-256) ECDSA keys.`
    );
  }

  // Verify the curve by re-exporting and checking the key details
  // Node.js KeyObject doesn't directly expose the curve name, but we
  // can verify by trying to use it with our expected curve. The SPKI
  // encoding embeds the OID for the curve, so if it parsed successfully
  // as an EC key and the OID matches prime256v1, we're good.
  // Additional validation: try to create an ECDH with the same curve
  // and import the key — this will fail if the curves don't match.
  try {
    const jwk = keyObject.export({ format: 'jwk' });
    if (jwk.crv !== 'P-256') {
      throw new Error(
        `Invalid curve: expected P-256 (prime256v1/secp256r1), got ${jwk.crv}. ` +
        `CryptiLink only supports the NIST P-256 curve.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Invalid curve')) {
      throw err;
    }
    throw new Error(
      'Could not verify key curve. Ensure the key uses prime256v1 (secp256r1 / P-256).'
    );
  }
}

/**
 * Registers a new wallet with the consumer's public key.
 *
 * @param publicKeyBase64 - Consumer's ECDSA public key, base64-encoded SPKI DER
 * @returns The created wallet details
 */
export async function registerWallet(publicKeyBase64: string): Promise<WalletRegistrationResult> {
  // Validate the key before doing anything else
  validateConsumerPublicKey(publicKeyBase64);

  // Generate a prefixed wallet ID
  const walletId = `${WALLET_ID_PREFIX}${uuidv4()}`;

  // Insert wallet with mock starting balance
  const result = await query<{ wallet_id: string; status: string; created_at: Date }>(
    `INSERT INTO wallets (wallet_id, public_key, liquid_balance, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING wallet_id, status, created_at`,
    [walletId, publicKeyBase64, INITIAL_LIQUID_BALANCE]
  );

  // Initialize the exposure tracking row
  await query(
    `INSERT INTO wallet_exposure (wallet_id, cumulative_exposure, last_sequence_counter)
     VALUES ($1, 0, 0)`,
    [walletId]
  );

  const row = result.rows[0];
  return {
    wallet_id: row.wallet_id,
    status: row.status,
    created_at: row.created_at,
  };
}
