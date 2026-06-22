/**
 * CryptiLink — Compact Payload Serializer Unit Tests
 *
 * Tests the 84-byte compact payload format:
 * - Round-trip serialization/deserialization
 * - hashWalletId() function
 * - DER ↔ raw signature conversion
 * - Edge cases (max values, zero values)
 */

import crypto from 'crypto';
import {
  serializeCompactPayload,
  deserializeCompactPayload,
  serializePayloadData,
  hashWalletId,
  derToRawSignature,
  rawToDerSignature,
  signCompactPayloadData,
  verifyCompactPayloadSignature,
} from '../crypto/compactPayload';
import { CompactPayload, CompactPayloadData, COMPACT_PAYLOAD_SIZE } from '../types/compactPayload';

describe('hashWalletId', () => {
  it('should produce an 8-byte (16 hex char) hash', () => {
    const hash = hashWalletId('CL-VAULT-test-wallet-123');
    expect(hash).toHaveLength(16); // 8 bytes = 16 hex chars
  });

  it('should be deterministic', () => {
    const hash1 = hashWalletId('CL-VAULT-abc');
    const hash2 = hashWalletId('CL-VAULT-abc');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different wallet IDs', () => {
    const hash1 = hashWalletId('CL-VAULT-wallet-1');
    const hash2 = hashWalletId('CL-VAULT-wallet-2');
    expect(hash1).not.toBe(hash2);
  });

  it('should be a truncated SHA-256', () => {
    const walletId = 'CL-VAULT-known-value';
    const fullHash = crypto.createHash('sha256').update(walletId).digest('hex');
    const truncated = hashWalletId(walletId);
    // First 16 hex chars of the full SHA-256 should match
    expect(fullHash.substring(0, 16)).toBe(truncated);
  });
});

describe('serializePayloadData', () => {
  it('should produce a 20-byte buffer', () => {
    const data: CompactPayloadData = {
      walletIdHash: hashWalletId('CL-VAULT-test'),
      amount: 150.50,
      sequenceCounter: 1,
      timestamp: 1718800000,
    };
    const buf = serializePayloadData(data);
    expect(buf.length).toBe(20);
  });

  it('should encode amount as paise (×100)', () => {
    const data: CompactPayloadData = {
      walletIdHash: hashWalletId('CL-VAULT-test'),
      amount: 199.99,
      sequenceCounter: 1,
      timestamp: 1000000,
    };
    const buf = serializePayloadData(data);
    // Amount is at offset 8, 4 bytes int32 BE
    const paise = buf.readInt32BE(8);
    expect(paise).toBe(19999);
  });

  it('should reject invalid wallet_id_hash length', () => {
    const data: CompactPayloadData = {
      walletIdHash: 'abc', // Too short
      amount: 100,
      sequenceCounter: 1,
      timestamp: 1000000,
    };
    expect(() => serializePayloadData(data)).toThrow();
  });
});

describe('DER ↔ Raw signature conversion', () => {
  it('should round-trip DER → Raw → DER and verify', () => {
    // Generate a test keypair and sign something
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const testData = Buffer.from('test data for signature round-trip');
    const signer = crypto.createSign('SHA256');
    signer.update(testData);
    signer.end();

    const privateKeyObj = crypto.createPrivateKey({
      key: privateKey as Buffer,
      type: 'pkcs8',
      format: 'der',
    });
    const derSig = signer.sign(privateKeyObj);

    // Convert DER → Raw
    const rawSig = derToRawSignature(derSig);
    expect(rawSig.length).toBe(64);

    // Convert Raw → DER
    const derSig2 = rawToDerSignature(rawSig);

    // Verify the round-tripped signature
    const publicKeyObj = crypto.createPublicKey({
      key: publicKey as Buffer,
      type: 'spki',
      format: 'der',
    });

    const verifier = crypto.createVerify('SHA256');
    verifier.update(testData);
    verifier.end();
    expect(verifier.verify(publicKeyObj, derSig2)).toBe(true);
  });

  it('should produce exactly 64 bytes for raw format', () => {
    // Run multiple times to catch edge cases with padding
    for (let i = 0; i < 20; i++) {
      const { privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        privateKeyEncoding: { type: 'pkcs8', format: 'der' },
        publicKeyEncoding: { type: 'spki', format: 'der' },
      });

      const privateKeyObj = crypto.createPrivateKey({
        key: privateKey as Buffer,
        type: 'pkcs8',
        format: 'der',
      });

      const signer = crypto.createSign('SHA256');
      signer.update(Buffer.from(`iteration-${i}`));
      signer.end();
      const derSig = signer.sign(privateKeyObj);

      const rawSig = derToRawSignature(derSig);
      expect(rawSig.length).toBe(64);
    }
  });
});

describe('serializeCompactPayload / deserializeCompactPayload', () => {
  it('should round-trip a complete payload', () => {
    // Generate a keypair for signing
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const privateKeyObj = crypto.createPrivateKey({
      key: privateKey as Buffer,
      type: 'pkcs8',
      format: 'der',
    });

    const walletId = 'CL-VAULT-round-trip-test';
    const data: CompactPayloadData = {
      walletIdHash: hashWalletId(walletId),
      amount: 175.50,
      sequenceCounter: 42,
      timestamp: 1718800000,
    };

    // Sign the data
    const signature = signCompactPayloadData(data, privateKeyObj);

    const payload: CompactPayload = {
      ...data,
      signature,
    };

    // Serialize
    const buf = serializeCompactPayload(payload);
    expect(buf.length).toBe(COMPACT_PAYLOAD_SIZE);

    // Deserialize
    const restored = deserializeCompactPayload(buf);

    expect(restored.walletIdHash).toBe(payload.walletIdHash);
    expect(restored.amount).toBeCloseTo(payload.amount, 2);
    expect(restored.sequenceCounter).toBe(payload.sequenceCounter);
    expect(restored.timestamp).toBe(payload.timestamp);
    expect(restored.signature).toBe(payload.signature);
  });

  it('should reject buffers that are not 84 bytes', () => {
    expect(() => deserializeCompactPayload(Buffer.alloc(80))).toThrow('84 bytes');
    expect(() => deserializeCompactPayload(Buffer.alloc(85))).toThrow('84 bytes');
  });
});

describe('signCompactPayloadData / verifyCompactPayloadSignature', () => {
  it('should sign and verify correctly', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const privateKeyObj = crypto.createPrivateKey({
      key: privateKey as Buffer,
      type: 'pkcs8',
      format: 'der',
    });

    const publicKeyBase64 = (publicKey as Buffer).toString('base64');
    const walletId = 'CL-VAULT-sign-test';

    const data: CompactPayloadData = {
      walletIdHash: hashWalletId(walletId),
      amount: 200,
      sequenceCounter: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const signature = signCompactPayloadData(data, privateKeyObj);
    expect(typeof signature).toBe('string');

    const payload: CompactPayload = { ...data, signature };
    const isValid = verifyCompactPayloadSignature(payload, publicKeyBase64);
    expect(isValid).toBe(true);
  });

  it('should reject tampered data', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const privateKeyObj = crypto.createPrivateKey({
      key: privateKey as Buffer,
      type: 'pkcs8',
      format: 'der',
    });

    const publicKeyBase64 = (publicKey as Buffer).toString('base64');
    const walletId = 'CL-VAULT-tamper-test';

    const data: CompactPayloadData = {
      walletIdHash: hashWalletId(walletId),
      amount: 100,
      sequenceCounter: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const signature = signCompactPayloadData(data, privateKeyObj);

    // Tamper with the amount
    const tamperedPayload: CompactPayload = {
      ...data,
      amount: 999, // Changed!
      signature,
    };

    const isValid = verifyCompactPayloadSignature(tamperedPayload, publicKeyBase64);
    expect(isValid).toBe(false);
  });

  it('should reject signature from wrong key', () => {
    const keyPair1 = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const keyPair2 = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const privateKeyObj1 = crypto.createPrivateKey({
      key: keyPair1.privateKey as Buffer,
      type: 'pkcs8',
      format: 'der',
    });

    // Sign with key 1 but verify with key 2's public key
    const publicKeyBase64_2 = (keyPair2.publicKey as Buffer).toString('base64');

    const data: CompactPayloadData = {
      walletIdHash: hashWalletId('CL-VAULT-wrong-key'),
      amount: 50,
      sequenceCounter: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const signature = signCompactPayloadData(data, privateKeyObj1);
    const payload: CompactPayload = { ...data, signature };

    const isValid = verifyCompactPayloadSignature(payload, publicKeyBase64_2);
    expect(isValid).toBe(false);
  });
});
