/**
 * CryptiLink Bank Server — Configuration
 *
 * Security-critical constants are HARDCODED, not loaded from env vars,
 * to prevent tampering via environment manipulation. Only infrastructure
 * settings (DB, port, key paths) come from the environment.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// ═══════════════════════════════════════════════════════════════
// SECURITY CAPS — HARDCODED BY DESIGN
// These values are the core risk controls for the offline protocol.
// Do NOT make these configurable via env vars.
// ═══════════════════════════════════════════════════════════════

/** Maximum amount for a single offline transaction (₹200 = 20000 paise) */
export const MAX_OFFLINE_TX_AMOUNT = 200;

/** Maximum cumulative offline exposure before a certificate refresh is required (₹500) */
export const MAX_OFFLINE_CUMULATIVE = 500;

/** Mock starting liquid balance for new wallets (₹10,000 — prototype only) */
export const INITIAL_LIQUID_BALANCE = 10000;

/** Certificate validity duration in seconds (24 hours for prototype) */
export const CERTIFICATE_VALIDITY_SECONDS = 24 * 60 * 60;

/**
 * ECDSA curve identifier.
 * OpenSSL calls it "prime256v1". NIST/Android/WebCrypto call it "secp256r1".
 * They are the SAME curve — P-256.
 * We use "prime256v1" because that's what Node.js crypto.createECDH() expects.
 * When interacting with Android (Phase 2+), use "secp256r1" or "P-256".
 */
export const ECDSA_CURVE = 'prime256v1';

/** Wallet ID prefix for all CryptiLink vaults */
export const WALLET_ID_PREFIX = 'CL-VAULT-';

// ═══════════════════════════════════════════════════════════════
// INFRASTRUCTURE CONFIG — FROM ENVIRONMENT
// ═══════════════════════════════════════════════════════════════

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cryptilink',
  bankPrivateKeyPath: path.resolve(process.env.BANK_PRIVATE_KEY_PATH || './keys/bank_private.pem'),
  bankPublicKeyPath: path.resolve(process.env.BANK_PUBLIC_KEY_PATH || './keys/bank_public.pem'),
};
