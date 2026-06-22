/**
 * CryptiLink — Certificate Signing & Verification
 *
 * Signs certificate payloads with the bank's ECDSA private key and
 * verifies them with the bank's public key. Uses SHA-256 as the
 * hash algorithm for ECDSA signatures.
 *
 * CRITICAL: The payload is canonicalized (sorted keys, no whitespace)
 * before signing. This ensures deterministic verification across all
 * platforms (Node.js, Android, iOS) that may re-verify the certificate.
 */

import crypto from 'crypto';
import { getBankPrivateKey, getBankPublicKey } from './bankKeys';
import { CertificatePayload, SignedCertificate, canonicalizeCertificate } from '../types/certificate';

/**
 * Signs a certificate payload with the bank's ECDSA private key.
 *
 * Process:
 * 1. Canonicalize the payload (sorted keys, no whitespace JSON)
 * 2. Sign the canonical JSON bytes with ECDSA-SHA256
 * 3. Return the signature as a base64 string
 *
 * @param payload - The certificate payload to sign (without bank_signature)
 * @returns The signed certificate with bank_signature attached
 */
export function signCertificate(payload: CertificatePayload): SignedCertificate {
  // Step 1: Canonicalize — this MUST be deterministic
  const canonicalJson = canonicalizeCertificate(payload);

  // Step 2: Sign the canonical JSON bytes with the bank's private key
  const signer = crypto.createSign('SHA256');
  signer.update(canonicalJson);
  signer.end();

  const signature = signer.sign(getBankPrivateKey(), 'base64');

  // Step 3: Return the full signed certificate
  return {
    ...payload,
    bank_signature: signature,
  };
}

/**
 * Verifies a signed certificate's bank_signature against the bank's public key.
 *
 * Process:
 * 1. Extract the payload fields (everything except bank_signature)
 * 2. Canonicalize them identically to how they were signed
 * 3. Verify the signature using the bank's public key
 *
 * @param cert - The signed certificate to verify
 * @returns true if the signature is valid, false otherwise
 */
export function verifyCertificate(cert: SignedCertificate): boolean {
  // Extract payload (everything except bank_signature)
  const payload: CertificatePayload = {
    version: cert.version,
    wallet_id: cert.wallet_id,
    public_key: cert.public_key,
    max_offline_limit: cert.max_offline_limit,
    expiry: cert.expiry,
  };

  const canonicalJson = canonicalizeCertificate(payload);

  const verifier = crypto.createVerify('SHA256');
  verifier.update(canonicalJson);
  verifier.end();

  return verifier.verify(getBankPublicKey(), cert.bank_signature, 'base64');
}

/**
 * Verifies a consumer's ECDSA signature over arbitrary data.
 * Used during settlement to verify that the consumer actually
 * authorized a transaction.
 *
 * @param publicKeyBase64 - Consumer's public key, base64-encoded SPKI DER
 * @param data - The data that was signed
 * @param signatureBase64 - The signature to verify, base64-encoded
 * @returns true if the signature is valid
 */
export function verifyConsumerSignature(
  publicKeyBase64: string,
  data: Buffer,
  signatureBase64: string
): boolean {
  try {
    // The consumer's public key is stored as base64-encoded SPKI DER
    const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');
    const publicKey = crypto.createPublicKey({
      key: publicKeyDer,
      type: 'spki',
      format: 'der',
    });

    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    verifier.end();

    return verifier.verify(publicKey, signatureBase64, 'base64');
  } catch {
    // Any error in key parsing or verification = invalid
    return false;
  }
}
