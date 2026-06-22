/**
 * CryptiLink Phase 4 — Merchant Onboarding Service
 *
 * Handles merchant registration with the bank server and initial setup:
 * 1. Register the merchant via the same wallet/register endpoint consumers use
 * 2. Fetch and cache the bank's ECDSA public key for offline cert verification
 * 3. Store merchant credentials in local SQLCipher
 *
 * Phase 1 CONFIRMED: The bank treats merchants the same as consumers
 * for registration purposes (POST /api/v1/wallet/register). The
 * merchant's identity is differentiated only during settlement
 * (merchant_id field in the settlement batch).
 */

import { setConfig, getConfig } from '../db/MerchantDatabase';

/** Bank server base URL — configure via merchant setup */
const DEFAULT_BANK_URL = 'http://localhost:3000';

export interface MerchantRegistrationResult {
  merchantId: string;
  walletId: string;
  bankPublicKey: string;
}

export interface OnboardingStatus {
  isOnboarded: boolean;
  merchantId: string | null;
  walletId: string | null;
  hasBankPublicKey: boolean;
}

/**
 * Checks the current onboarding status from local config.
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const merchantId = await getConfig('merchant_id');
  const walletId = await getConfig('wallet_id');
  const bankPublicKey = await getConfig('bank_public_key');

  return {
    isOnboarded: !!(merchantId && walletId && bankPublicKey),
    merchantId,
    walletId,
    hasBankPublicKey: !!bankPublicKey,
  };
}

/**
 * Gets the configured bank server URL.
 */
export async function getBankUrl(): Promise<string> {
  return (await getConfig('bank_url')) || DEFAULT_BANK_URL;
}

/**
 * Sets the bank server URL.
 */
export async function setBankUrl(url: string): Promise<void> {
  await setConfig('bank_url', url);
}

/**
 * Fetches the bank's ECDSA public key from the server and caches it.
 * This key is used for offline certificate verification (Check 1).
 *
 * The bank serves this at GET /api/v1/bank/public-key.
 * The response is:
 * {
 *   "public_key": "<PEM string>",
 *   "algorithm": "ECDSA",
 *   "curve": "prime256v1 (secp256r1 / P-256)",
 *   "format": "SPKI PEM"
 * }
 *
 * @returns The bank's public key in PEM format
 */
export async function fetchAndCacheBankPublicKey(): Promise<string> {
  const bankUrl = await getBankUrl();
  const response = await fetch(`${bankUrl}/api/v1/bank/public-key`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch bank public key: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const publicKeyPem: string = data.public_key;

  if (!publicKeyPem || !publicKeyPem.includes('BEGIN PUBLIC KEY')) {
    throw new Error('Invalid bank public key response: missing or malformed PEM');
  }

  await setConfig('bank_public_key', publicKeyPem);
  await setConfig('bank_public_key_algorithm', data.algorithm || 'ECDSA');
  await setConfig('bank_public_key_curve', data.curve || 'prime256v1');

  return publicKeyPem;
}

/**
 * Gets the cached bank public key from local storage.
 * Returns null if not yet fetched.
 */
export async function getCachedBankPublicKey(): Promise<string | null> {
  return getConfig('bank_public_key');
}

/**
 * Registers the merchant with the bank server.
 *
 * Uses the same POST /api/v1/wallet/register endpoint as consumers.
 * The merchant_id is a separate identifier the merchant provides
 * (e.g. their store/business ID) — it's stored locally and sent
 * with settlement batches.
 *
 * @param merchantId - Merchant's business identifier (e.g. "MERCHANT-STORE-001")
 * @param publicKeyBase64 - Merchant's ECDSA public key, base64-encoded SPKI DER
 * @returns Registration result with wallet_id from the bank
 */
export async function registerMerchant(
  merchantId: string,
  publicKeyBase64: string,
): Promise<MerchantRegistrationResult> {
  const bankUrl = await getBankUrl();

  // Step 1: Register with the bank (same endpoint as consumers)
  const registerResponse = await fetch(`${bankUrl}/api/v1/wallet/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKeyBase64 }),
  });

  if (!registerResponse.ok) {
    const error = await registerResponse.json().catch(() => ({}));
    throw new Error(
      `Merchant registration failed: ${registerResponse.status} — ${error.error || 'Unknown error'}`,
    );
  }

  const registerData = await registerResponse.json();
  const walletId: string = registerData.wallet_id;

  // Step 2: Fetch and cache the bank's public key
  const bankPublicKey = await fetchAndCacheBankPublicKey();

  // Step 3: Store merchant credentials locally
  await setConfig('merchant_id', merchantId);
  await setConfig('wallet_id', walletId);
  await setConfig('merchant_public_key', publicKeyBase64);
  await setConfig('onboarded_at', String(Math.floor(Date.now() / 1000)));

  return {
    merchantId,
    walletId,
    bankPublicKey,
  };
}

/**
 * Gets the merchant's stored ID for settlement batches.
 */
export async function getMerchantId(): Promise<string | null> {
  return getConfig('merchant_id');
}

/**
 * Gets the merchant's wallet ID from the bank.
 */
export async function getMerchantWalletId(): Promise<string | null> {
  return getConfig('wallet_id');
}
