/**
 * CryptiLink Phase 4 — Offline Verifier Unit Tests
 *
 * Verifies the core offline 4-check logic.
 */

import { verifyTransaction } from '../services/OfflineVerifier';
import { cacheCertificate, updateLastSequence, getDatabase } from '../db/MerchantDatabase';
import { extractRawPublicKey, stringToBytes } from '../crypto/ecdsaVerify';
// In a real environment, we'd mock @noble/curves and SQLite here.
// For the prototype test file, we mock the local DB calls and crypto wrapper.

jest.mock('../db/MerchantDatabase', () => ({
  getCachedCertificate: jest.fn(),
  cacheCertificate: jest.fn(),
  getLastSequence: jest.fn(),
  updateLastSequence: jest.fn(),
  getDatabase: jest.fn(),
}));

jest.mock('../crypto/ecdsaVerify', () => ({
  verifyEcdsaSignature: jest.fn(),
  canonicalizeCertificate: jest.fn(() => '{"canonical":true}'),
  derToRaw: jest.fn(),
  extractRawPublicKey: jest.fn(),
  serializePayloadData: jest.fn(),
  base64ToBytes: jest.fn(() => new Uint8Array(64)),
  stringToBytes: jest.fn(),
  hexToBytes: jest.fn(),
}));

jest.mock('../MerchantOnboarding', () => ({
  getCachedBankPublicKey: jest.fn(() => '-----BEGIN PUBLIC KEY-----\nMOCK_BANK_KEY\n-----END PUBLIC KEY-----'),
}));

import { getCachedCertificate, getLastSequence } from '../db/MerchantDatabase';
import { verifyEcdsaSignature } from '../crypto/ecdsaVerify';

describe('OfflineVerifier', () => {
  const validCert = {
    version: 1,
    wallet_id: 'CL-VAULT-123',
    public_key: 'MOCK_CONSUMER_KEY',
    max_offline_limit: 500,
    expiry: Math.floor(Date.now() / 1000) + 3600, // +1 hour
    bank_signature: 'MOCK_SIG',
  };

  const validPayload = {
    walletIdHash: '1234567890abcdef',
    amount: 150,
    sequenceCounter: 5,
    timestamp: Math.floor(Date.now() / 1000),
    signature: 'MOCK_PAYLOAD_SIG',
    channel: 'SMS' as const,
    receivedAt: Math.floor(Date.now() / 1000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCachedCertificate as jest.Mock).mockResolvedValue({
      certificateJson: JSON.stringify(validCert),
    });
    (getLastSequence as jest.Mock).mockResolvedValue(4);
    (verifyEcdsaSignature as jest.Mock).mockResolvedValue(true);
  });

  it('passes all 4 checks for a valid transaction', async () => {
    const result = await verifyTransaction(validPayload);
    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it('fails Check 1 if bank signature is invalid', async () => {
    (verifyEcdsaSignature as jest.Mock).mockImplementationOnce(() => false);
    const result = await verifyTransaction(validPayload);
    expect(result.passed).toBe(false);
    expect(result.failedCheck).toBe(1);
    expect(result.rejectionReason).toBe('INVALID_BANK_SIGNATURE');
  });

  it('fails Check 2 if certificate is expired', async () => {
    const expiredCert = { ...validCert, expiry: Math.floor(Date.now() / 1000) - 3600 };
    (getCachedCertificate as jest.Mock).mockResolvedValue({
      certificateJson: JSON.stringify(expiredCert),
    });
    const result = await verifyTransaction(validPayload);
    expect(result.passed).toBe(false);
    expect(result.failedCheck).toBe(2);
    expect(result.rejectionReason).toBe('CERTIFICATE_EXPIRED');
  });

  it('fails Check 3 on sequence replay (same or lower sequence)', async () => {
    (getLastSequence as jest.Mock).mockResolvedValue(5); // payload has sequence 5
    const result = await verifyTransaction(validPayload);
    expect(result.passed).toBe(false);
    expect(result.failedCheck).toBe(3);
    expect(result.rejectionReason).toBe('REPLAY_ATTACK_DETECTED');
  });

  it('fails Check 4 if transaction signature is invalid', async () => {
    (verifyEcdsaSignature as jest.Mock)
      .mockImplementationOnce(() => true) // Check 1 passes
      .mockImplementationOnce(() => false); // Check 4 fails
    const result = await verifyTransaction(validPayload);
    expect(result.passed).toBe(false);
    expect(result.failedCheck).toBe(4);
    expect(result.rejectionReason).toBe('INVALID_SIGNATURE');
  });
});
