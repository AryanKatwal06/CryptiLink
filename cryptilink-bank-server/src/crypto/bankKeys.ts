/**
 * CryptiLink — Bank ECDSA Keypair Management
 *
 * ══════════════════════════════════════════════════════════════════════
 * CRYPTOGRAPHIC CONTEXT
 * ══════════════════════════════════════════════════════════════════════
 *
 * The bank's keypair is the ROOT OF TRUST for the entire CryptiLink protocol.
 * The bank signs certificates with its private key; consumers and merchants
 * verify certificates using the bank's public key.
 *
 * CURVE: prime256v1 (OpenSSL name)
 *    = secp256r1   (NIST name, used by Android KeyStore)
 *    = P-256       (WebCrypto name)
 *    All three names refer to the SAME curve. We use "prime256v1" because
 *    that's what Node.js's crypto module expects in generateKeyPairSync().
 *
 * KEY FORMAT: PEM (PKCS#8 for private, SPKI for public)
 *    These are standard formats that interop with OpenSSL, Java, and most
 *    crypto libraries. The public key is served via API for client apps.
 *
 * SECURITY NOTE: The private key file must NEVER be committed to the repo,
 *    logged, or exposed via any API endpoint. It is loaded from a path
 *    specified by the BANK_PRIVATE_KEY_PATH env var.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config, ECDSA_CURVE } from '../config';

let bankPrivateKey: crypto.KeyObject | null = null;
let bankPublicKey: crypto.KeyObject | null = null;

/**
 * Generates a new ECDSA keypair and writes PEM files to disk.
 * Called on first startup if key files don't exist, or by the
 * generate-bank-keys.ts CLI script for key rotation.
 */
export function generateBankKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: ECDSA_CURVE,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return {
    privateKeyPem: privateKey as string,
    publicKeyPem: publicKey as string,
  };
}

/**
 * Writes a keypair to disk at the configured paths.
 * Creates the directory if it doesn't exist.
 */
export function writeKeysToDisk(privateKeyPem: string, publicKeyPem: string): void {
  const privateDir = path.dirname(config.bankPrivateKeyPath);
  const publicDir = path.dirname(config.bankPublicKeyPath);

  if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write private key with restrictive permissions (owner read-only)
  fs.writeFileSync(config.bankPrivateKeyPath, privateKeyPem, { mode: 0o400 });
  fs.writeFileSync(config.bankPublicKeyPath, publicKeyPem, { mode: 0o644 });
}

/**
 * Loads the bank's keypair from disk, generating a new one if files
 * don't exist. This is called once at server startup.
 *
 * IMPORTANT: If keys are generated automatically, a warning is logged.
 * In production, keys should be pre-generated and provisioned securely.
 */
export function loadBankKeys(): void {
  const privateExists = fs.existsSync(config.bankPrivateKeyPath);
  const publicExists = fs.existsSync(config.bankPublicKeyPath);

  if (privateExists && publicExists) {
    const privatePem = fs.readFileSync(config.bankPrivateKeyPath, 'utf-8');
    const publicPem = fs.readFileSync(config.bankPublicKeyPath, 'utf-8');

    bankPrivateKey = crypto.createPrivateKey(privatePem);
    bankPublicKey = crypto.createPublicKey(publicPem);

    console.log('[BANK KEYS] ✓ Loaded existing keypair from disk');
  } else {
    throw new Error(
      '[BANK KEYS] ⚠ No keypair found on disk! ' +
      'You must explicitly generate a keypair before starting the server. ' +
      'Run `npx ts-node scripts/generate-bank-keys.ts`.'
    );
  }

  // Verify the loaded key is on the correct curve
  const keyDetail = bankPublicKey.asymmetricKeyType;
  if (keyDetail !== 'ec') {
    throw new Error(`[BANK KEYS] Expected EC key, got ${keyDetail}`);
  }
}

/**
 * Returns the bank's private key for signing operations.
 * Throws if keys haven't been loaded yet.
 */
export function getBankPrivateKey(): crypto.KeyObject {
  if (!bankPrivateKey) {
    throw new Error('[BANK KEYS] Keys not loaded — call loadBankKeys() first');
  }
  return bankPrivateKey;
}

/**
 * Returns the bank's public key for verification or for serving via API.
 * Throws if keys haven't been loaded yet.
 */
export function getBankPublicKey(): crypto.KeyObject {
  if (!bankPublicKey) {
    throw new Error('[BANK KEYS] Keys not loaded — call loadBankKeys() first');
  }
  return bankPublicKey;
}

/**
 * Returns the bank's public key as a base64-encoded DER string.
 * This is the value served by GET /api/v1/bank/public-key.
 */
export function getBankPublicKeyBase64(): string {
  const derBuffer = getBankPublicKey().export({
    type: 'spki',
    format: 'der',
  });
  return derBuffer.toString('base64');
}
