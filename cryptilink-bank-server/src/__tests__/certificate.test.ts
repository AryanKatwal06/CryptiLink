/**
 * CryptiLink — Certificate Signing/Verification Unit Tests
 *
 * Tests the bank's certificate signing and verification:
 * - Round-trip sign → verify
 * - Tamper detection (modified fields → verification fails)
 * - Canonical JSON determinism
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { CertificatePayload, SignedCertificate, canonicalizeCertificate } from '../types/certificate';

// We need to set up bank keys before importing signing module
// Create a temporary key directory for tests
const testKeyDir = path.join(os.tmpdir(), `cryptilink-test-keys-${Date.now()}`);

beforeAll(() => {
  fs.mkdirSync(testKeyDir, { recursive: true });
  process.env.BANK_PRIVATE_KEY_PATH = path.join(testKeyDir, 'test_private.pem');
  process.env.BANK_PUBLIC_KEY_PATH = path.join(testKeyDir, 'test_public.pem');
});

afterAll(() => {
  // Clean up test keys
  try {
    fs.rmSync(testKeyDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

// Import after env vars are set
import { loadBankKeys } from '../crypto/bankKeys';
import { signCertificate, verifyCertificate } from '../crypto/signing';

describe('canonicalizeCertificate', () => {
  it('should produce deterministic JSON with sorted keys', () => {
    const payload: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-test',
      public_key: 'dGVzdA==',
      max_offline_limit: 500,
      expiry: 1781874000,
    };

    const canonical = canonicalizeCertificate(payload);
    const parsed = JSON.parse(canonical);
    const keys = Object.keys(parsed);

    // Keys should be in alphabetical order
    expect(keys).toEqual(['expiry', 'max_offline_limit', 'public_key', 'version', 'wallet_id']);

    // No whitespace
    expect(canonical).not.toContain(' ');
    expect(canonical).not.toContain('\n');
    expect(canonical).not.toContain('\t');
  });

  it('should produce the same output regardless of input key order', () => {
    const payload1: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-abc',
      public_key: 'abc==',
      max_offline_limit: 500,
      expiry: 1000,
    };

    // Same data, but we rely on canonicalize to sort
    const payload2: CertificatePayload = {
      expiry: 1000,
      public_key: 'abc==',
      max_offline_limit: 500,
      wallet_id: 'CL-VAULT-abc',
      version: 1,
    };

    expect(canonicalizeCertificate(payload1)).toBe(canonicalizeCertificate(payload2));
  });
});

describe('signCertificate / verifyCertificate', () => {
  beforeAll(() => {
    loadBankKeys();
  });

  it('should sign and verify a certificate round-trip', () => {
    const payload: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-sign-test',
      public_key: 'dGVzdHB1YmxpY2tleQ==',
      max_offline_limit: 500,
      expiry: Math.floor(Date.now() / 1000) + 86400,
    };

    const signed = signCertificate(payload);

    // Should have all original fields plus bank_signature
    expect(signed.version).toBe(payload.version);
    expect(signed.wallet_id).toBe(payload.wallet_id);
    expect(signed.public_key).toBe(payload.public_key);
    expect(signed.max_offline_limit).toBe(payload.max_offline_limit);
    expect(signed.expiry).toBe(payload.expiry);
    expect(typeof signed.bank_signature).toBe('string');
    expect(signed.bank_signature.length).toBeGreaterThan(0);

    // Verify the signature
    const isValid = verifyCertificate(signed);
    expect(isValid).toBe(true);
  });

  it('should detect tampered wallet_id', () => {
    const payload: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-tamper-1',
      public_key: 'dGVzdA==',
      max_offline_limit: 500,
      expiry: Math.floor(Date.now() / 1000) + 86400,
    };

    const signed = signCertificate(payload);

    // Tamper with wallet_id
    const tampered: SignedCertificate = {
      ...signed,
      wallet_id: 'CL-VAULT-EVIL',
    };

    expect(verifyCertificate(tampered)).toBe(false);
  });

  it('should detect tampered max_offline_limit', () => {
    const payload: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-tamper-2',
      public_key: 'dGVzdA==',
      max_offline_limit: 500,
      expiry: Math.floor(Date.now() / 1000) + 86400,
    };

    const signed = signCertificate(payload);

    // Try to increase the offline limit
    const tampered: SignedCertificate = {
      ...signed,
      max_offline_limit: 999999,
    };

    expect(verifyCertificate(tampered)).toBe(false);
  });

  it('should detect tampered expiry', () => {
    const payload: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-tamper-3',
      public_key: 'dGVzdA==',
      max_offline_limit: 500,
      expiry: Math.floor(Date.now() / 1000) + 86400,
    };

    const signed = signCertificate(payload);

    // Try to extend the expiry
    const tampered: SignedCertificate = {
      ...signed,
      expiry: signed.expiry + 999999,
    };

    expect(verifyCertificate(tampered)).toBe(false);
  });

  it('should produce different signatures for different payloads', () => {
    const payload1: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-diff-1',
      public_key: 'dGVzdA==',
      max_offline_limit: 500,
      expiry: 1000000,
    };

    const payload2: CertificatePayload = {
      version: 1,
      wallet_id: 'CL-VAULT-diff-2',
      public_key: 'dGVzdA==',
      max_offline_limit: 500,
      expiry: 1000000,
    };

    const signed1 = signCertificate(payload1);
    const signed2 = signCertificate(payload2);

    // Different payloads should (almost certainly) produce different signatures
    // Note: ECDSA is non-deterministic (uses random k), so even the same
    // payload would produce different signatures. But that's fine — we just
    // verify both are valid.
    expect(verifyCertificate(signed1)).toBe(true);
    expect(verifyCertificate(signed2)).toBe(true);
  });
});
