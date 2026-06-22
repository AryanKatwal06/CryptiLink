/**
 * CryptiLink Phase 4 — Certificate Sync Service
 *
 * Implements the merchant side of CERT_SYNC_REQUEST / CERT_SYNC_RESPONSE
 * from Phase 3's design.
 *
 * Per-transaction compact payloads (84 bytes) only carry a truncated
 * wallet_id_hash (8 bytes), NOT the full certificate. The merchant must
 * have the full certificate cached locally to verify transactions offline.
 *
 * Flow when an unrecognized wallet_id_hash arrives:
 * 1. Check local cert_cache for the hash → if found, use cached cert
 * 2. If not found, attempt a CERT_SYNC_REQUEST:
 *    a. If online: fetch from bank server (POST with wallet_id_hash)
 *    b. If offline: queue the transaction for later verification
 *       when the cert becomes available
 *
 * The actual CERT_SYNC protocol over SMS/acoustic is defined by Phase 3.
 * This service implements the local cache management and fallback logic.
 */

import {
  getCachedCertificate,
  cacheCertificate,
  CachedCertificate,
} from '../db/MerchantDatabase';
import { getBankUrl } from './MerchantOnboarding';

/** The parsed certificate structure (matches Phase 1's SignedCertificate) */
export interface SignedCertificate {
  /** Schema version */
  version: number;
  /** Full wallet ID (CL-VAULT-<uuid>) */
  wallet_id: string;
  /** Consumer's ECDSA public key, base64-encoded SPKI DER */
  public_key: string;
  /** Maximum offline spending limit in ₹ */
  max_offline_limit: number;
  /** Unix timestamp (seconds) when certificate expires */
  expiry: number;
  /** Bank's ECDSA-SHA256 signature over canonical JSON, base64 */
  bank_signature: string;
}

/** Result of a cert lookup attempt */
export interface CertLookupResult {
  found: boolean;
  certificate: SignedCertificate | null;
  source: 'cache' | 'network' | 'none';
}

/** Pending cert sync requests (queued when offline) */
const pendingSyncRequests: Map<string, Array<() => void>> = new Map();

/**
 * Looks up a certificate for the given wallet_id_hash.
 *
 * First checks the local cache, then attempts a network fetch if online.
 *
 * @param walletIdHash - The 8-byte truncated hash (hex-encoded)
 * @returns The certificate if found, or null
 */
export async function lookupCertificate(
  walletIdHash: string,
): Promise<CertLookupResult> {
  // Step 1: Check local cache
  const cached = await getCachedCertificate(walletIdHash);
  if (cached) {
    try {
      const cert: SignedCertificate = JSON.parse(cached.certificateJson);
      return { found: true, certificate: cert, source: 'cache' };
    } catch {
      // Corrupted cache entry — fall through to network
    }
  }

  // Step 2: Attempt network fetch (CERT_SYNC_REQUEST)
  try {
    const cert = await fetchCertificateFromBank(walletIdHash);
    if (cert) {
      // Cache for future offline use
      await cacheCertificate(
        walletIdHash,
        cert.wallet_id,
        JSON.stringify(cert),
      );
      return { found: true, certificate: cert, source: 'network' };
    }
  } catch {
    // Network unavailable — expected in offline scenarios
  }

  return { found: false, certificate: null, source: 'none' };
}

/**
 * Fetches a certificate from the bank server by wallet_id_hash.
 *
 * This implements the network side of CERT_SYNC_REQUEST.
 * The bank server would need an endpoint that accepts a wallet_id_hash
 * and returns the full signed certificate.
 *
 * NOTE: Phase 1's current API doesn't have a dedicated cert-by-hash
 * endpoint. For the prototype, we use the wallet lookup + certificate
 * retrieval pattern. Production would add a dedicated endpoint.
 *
 * @param walletIdHash - The 8-byte truncated hash (hex-encoded)
 * @returns The signed certificate, or null if not found
 */
async function fetchCertificateFromBank(
  walletIdHash: string,
): Promise<SignedCertificate | null> {
  const bankUrl = await getBankUrl();

  // Use the cert-sync endpoint (to be added to bank server if needed)
  // For now, this is a best-effort lookup
  const response = await fetch(
    `${bankUrl}/api/v1/cert/lookup?wallet_id_hash=${encodeURIComponent(walletIdHash)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Certificate not found at bank
    }
    throw new Error(`Cert sync failed: ${response.status}`);
  }

  const data = await response.json();
  return data.certificate as SignedCertificate;
}

/**
 * Pre-caches a certificate received via CERT_SYNC_RESPONSE.
 *
 * Called when the full certificate arrives over SMS or acoustic
 * as part of Phase 3's CERT_SYNC protocol.
 *
 * @param walletIdHash - The wallet_id_hash this cert maps to
 * @param certificate - The full signed certificate
 */
export async function handleCertSyncResponse(
  walletIdHash: string,
  certificate: SignedCertificate,
): Promise<void> {
  await cacheCertificate(
    walletIdHash,
    certificate.wallet_id,
    JSON.stringify(certificate),
  );

  // Resolve any pending sync requests for this hash
  const pending = pendingSyncRequests.get(walletIdHash);
  if (pending) {
    pending.forEach((resolve) => resolve());
    pendingSyncRequests.delete(walletIdHash);
  }
}

/**
 * Registers a callback to be notified when a specific certificate
 * becomes available via CERT_SYNC_RESPONSE.
 *
 * Used when a transaction arrives for an uncached wallet — the
 * verification is queued until the cert sync completes.
 */
export function onCertAvailable(
  walletIdHash: string,
  callback: () => void,
): void {
  const existing = pendingSyncRequests.get(walletIdHash) || [];
  existing.push(callback);
  pendingSyncRequests.set(walletIdHash, existing);
}

/**
 * Checks whether a certificate is cached for a given hash.
 * Fast path — no network call.
 */
export async function hasCachedCertificate(
  walletIdHash: string,
): Promise<boolean> {
  const cached = await getCachedCertificate(walletIdHash);
  return cached !== null;
}
