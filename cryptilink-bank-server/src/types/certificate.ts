/**
 * CryptiLink — Certificate Type Definitions
 *
 * The certificate is the bank-signed attestation that a wallet has pre-loaded
 * funds into an offline vault. It is ISSUED ONCE per loading event and cached
 * by the client/merchant — it is NOT retransmitted per transaction.
 *
 * This separation is critical for Phase 3's SMS transport: the lightweight
 * per-transaction compact payload (84 bytes) references the wallet but does
 * not include the full certificate.
 */

export interface CertificatePayload {
  /** Schema version for forward compatibility */
  version: number;
  /** The wallet this certificate belongs to (CL-VAULT-<uuid>) */
  wallet_id: string;
  /** Consumer's ECDSA public key, base64-encoded (prime256v1/secp256r1) */
  public_key: string;
  /** Maximum amount (in ₹) this wallet can spend offline before needing a refresh */
  max_offline_limit: number;
  /** Unix timestamp (seconds) when this certificate expires */
  expiry: number;
}

export interface SignedCertificate extends CertificatePayload {
  /**
   * ECDSA-SHA256 signature over the canonical JSON of all CertificatePayload
   * fields (sorted keys, no whitespace), base64-encoded.
   * This field is EXCLUDED from the signed data.
   */
  bank_signature: string;
}

/**
 * Produces the canonical JSON string of a certificate payload for signing.
 * Keys are sorted alphabetically, no whitespace — this MUST be deterministic
 * across all platforms (Node.js, Android, iOS) that verify certificates.
 */
export function canonicalizeCertificate(payload: CertificatePayload): string {
  // WARNING: Key order is insertion-order dependent (ES2015+).
  // Do NOT add, remove, or reorder fields in this object
  // without regenerating all existing certificates.
  // A production implementation should use explicit sort:
  // Object.keys(payload).sort().reduce(...)
  const canonical = {
    expiry: payload.expiry,
    max_offline_limit: payload.max_offline_limit,
    public_key: payload.public_key,
    version: payload.version,
    wallet_id: payload.wallet_id,
  };
  return JSON.stringify(canonical);
}
