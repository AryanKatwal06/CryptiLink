/**
 * CryptiLink — Settlement Integration Tests
 *
 * These tests prove the core security properties of the settlement engine:
 *
 * 1. DOUBLE-SPEND CAP: Two merchants each submit valid-looking batches
 *    that individually pass all checks, but their SUM exceeds
 *    MAX_OFFLINE_CUMULATIVE (₹500). The second batch's transaction
 *    must be REJECTED with EXCEEDS_CUMULATIVE_EXPOSURE_CAP.
 *
 * 2. REPLAY ATTACK: Same sequence_counter submitted twice must be
 *    rejected with REPLAY_ATTACK_DETECTED.
 *
 * 3. EXPIRED CERTIFICATE: Transactions against an expired certificate
 *    must be rejected with CERTIFICATE_EXPIRED.
 *
 * These tests require a running PostgreSQL database. They create and
 * tear down their own test data.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Pool } from 'pg';

// ── Test setup ─────────────────────────────────────────────────────
const TEST_DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cryptilink';

// Set up temporary bank keys
const testKeyDir = path.join(os.tmpdir(), `cryptilink-integration-test-${Date.now()}`);

beforeAll(() => {
  fs.mkdirSync(testKeyDir, { recursive: true });
  process.env.BANK_PRIVATE_KEY_PATH = path.join(testKeyDir, 'test_private.pem');
  process.env.BANK_PUBLIC_KEY_PATH = path.join(testKeyDir, 'test_public.pem');
  process.env.DATABASE_URL = TEST_DB_URL;
});

afterAll(async () => {
  try {
    fs.rmSync(testKeyDir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
});

// Import after env setup
import { loadBankKeys } from '../crypto/bankKeys';
import { signCertificate } from '../crypto/signing';
import { hashWalletId, signCompactPayloadData } from '../crypto/compactPayload';
import { processSettlementBatch } from '../services/settlement';
import { pool, query, getClient } from '../db/pool';
import { CertificatePayload } from '../types/certificate';
import { MAX_OFFLINE_TX_AMOUNT, MAX_OFFLINE_CUMULATIVE, WALLET_ID_PREFIX, CERTIFICATE_VALIDITY_SECONDS } from '../config';
import { v4 as uuidv4 } from 'uuid';

// ── Helpers ─────────────────────────────────────────────────────────

function generateConsumerKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  return {
    privateKeyObj: crypto.createPrivateKey({
      key: privateKey as Buffer,
      type: 'pkcs8',
      format: 'der',
    }),
    publicKeyBase64: (publicKey as Buffer).toString('base64'),
  };
}

async function createTestWallet(publicKeyBase64: string, walletId?: string): Promise<string> {
  const id = walletId || `${WALLET_ID_PREFIX}${uuidv4()}`;

  await query(
    `INSERT INTO wallets (wallet_id, public_key, liquid_balance, status) VALUES ($1, $2, 10000, 'active')
     ON CONFLICT (wallet_id) DO NOTHING`,
    [id, publicKeyBase64]
  );

  await query(
    `INSERT INTO wallet_exposure (wallet_id, cumulative_exposure, last_sequence_counter) VALUES ($1, 0, 0)
     ON CONFLICT (wallet_id) DO NOTHING`,
    [id]
  );

  return id;
}

async function issueCertificate(walletId: string, publicKeyBase64: string, amount: number, expiryOverride?: number): Promise<void> {
  loadBankKeys();

  const now = Math.floor(Date.now() / 1000);
  const expiry = expiryOverride || (now + CERTIFICATE_VALIDITY_SECONDS);

  const payload: CertificatePayload = {
    version: 1,
    wallet_id: walletId,
    public_key: publicKeyBase64,
    max_offline_limit: amount,
    expiry,
  };

  const signed = signCertificate(payload);

  // Revoke existing certs
  await query(
    `UPDATE certificates SET revoked = TRUE WHERE wallet_id = $1 AND revoked = FALSE`,
    [walletId]
  );

  await query(
    `INSERT INTO certificates (wallet_id, max_offline_limit, expiry_timestamp, bank_signature)
     VALUES ($1, $2, $3, $4)`,
    [walletId, amount, expiry, signed.bank_signature]
  );

  // Reset exposure
  await query(
    `UPDATE wallet_exposure SET cumulative_exposure = 0, last_sequence_counter = 0 WHERE wallet_id = $1`,
    [walletId]
  );

  // Add escrow
  await query(
    `INSERT INTO escrow_ledger (wallet_id, amount, running_escrow) VALUES ($1, $2, $2)`,
    [walletId, amount]
  );
}

function signTransaction(
  walletId: string,
  amount: number,
  sequenceCounter: number,
  timestamp: number,
  privateKey: crypto.KeyObject
): string {
  return signCompactPayloadData(
    {
      walletIdHash: hashWalletId(walletId),
      amount,
      sequenceCounter,
      timestamp,
    },
    privateKey
  );
}

async function cleanupWallet(walletId: string): Promise<void> {
  await query('DELETE FROM settled_transactions WHERE wallet_id = $1', [walletId]);
  await query('DELETE FROM settlement_batches WHERE batch_id IN (SELECT batch_id FROM settlement_batches WHERE merchant_id LIKE $1)', ['TEST-%']);
  await query('DELETE FROM certificates WHERE wallet_id = $1', [walletId]);
  await query('DELETE FROM escrow_ledger WHERE wallet_id = $1', [walletId]);
  await query('DELETE FROM wallet_exposure WHERE wallet_id = $1', [walletId]);
  await query('DELETE FROM wallets WHERE wallet_id = $1', [walletId]);
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Settlement Engine — Double-Spend Cap Enforcement', () => {
  let walletId: string;
  let consumer: ReturnType<typeof generateConsumerKeyPair>;

  beforeAll(() => {
    loadBankKeys();
    consumer = generateConsumerKeyPair();
  });

  beforeEach(async () => {
    walletId = `${WALLET_ID_PREFIX}test-dblspend-${uuidv4()}`;
    await createTestWallet(consumer.publicKeyBase64, walletId);
    await issueCertificate(walletId, consumer.publicKeyBase64, MAX_OFFLINE_CUMULATIVE);
  });

  afterEach(async () => {
    await cleanupWallet(walletId);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should accept a single transaction within the cap', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sig = signTransaction(walletId, 200, 1, now, consumer.privateKeyObj);

    const result = await processSettlementBatch({
      merchant_id: 'TEST-MERCHANT-1',
      transactions: [{
        wallet_id: walletId,
        amount: 200,
        sequence_counter: 1,
        timestamp: now,
        signature: sig,
      }],
    });

    expect(result.results[0].accepted).toBe(true);
    expect(result.summary.total_settled_amount).toBe(200);
  });

  it('should reject a transaction that exceeds MAX_OFFLINE_TX_AMOUNT (₹200)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sig = signTransaction(walletId, 201, 1, now, consumer.privateKeyObj);

    const result = await processSettlementBatch({
      merchant_id: 'TEST-MERCHANT-2',
      transactions: [{
        wallet_id: walletId,
        amount: 201,
        sequence_counter: 1,
        timestamp: now,
        signature: sig,
      }],
    });

    expect(result.results[0].accepted).toBe(false);
    expect(result.results[0].rejected_reason).toBe('EXCEEDS_PER_TX_CAP');
  });

  it('should enforce cumulative cap across two merchant batches', async () => {
    /**
     * THE CORE DOUBLE-SPEND TEST
     *
     * Scenario:
     * - Wallet loaded with ₹500 certificate
     * - Merchant A submits ₹300 (valid, accepted)
     * - Merchant B submits ₹300 (individually valid, but cumulative = ₹600 > ₹500)
     *
     * Expected: Merchant B's transaction is REJECTED with
     * EXCEEDS_CUMULATIVE_EXPOSURE_CAP, and the total settled amount
     * across both batches is exactly ₹300 (never exceeds ₹500).
     */
    const now = Math.floor(Date.now() / 1000);

    // Merchant A: ₹300 (should succeed)
    const sigA = signTransaction(walletId, 300, 1, now, consumer.privateKeyObj);
    const resultA = await processSettlementBatch({
      merchant_id: 'TEST-MERCHANT-A',
      transactions: [{
        wallet_id: walletId,
        amount: 300,
        sequence_counter: 1,
        timestamp: now,
        signature: sigA,
      }],
    });

    expect(resultA.results[0].accepted).toBe(true);
    expect(resultA.summary.total_settled_amount).toBe(300);

    // Merchant B: ₹300 (should FAIL — cumulative would be ₹600 > ₹500)
    const sigB = signTransaction(walletId, 300, 2, now + 1, consumer.privateKeyObj);
    const resultB = await processSettlementBatch({
      merchant_id: 'TEST-MERCHANT-B',
      transactions: [{
        wallet_id: walletId,
        amount: 300,
        sequence_counter: 2,
        timestamp: now + 1,
        signature: sigB,
      }],
    });

    expect(resultB.results[0].accepted).toBe(false);
    expect(resultB.results[0].rejected_reason).toBe('EXCEEDS_CUMULATIVE_EXPOSURE_CAP');

    // CRITICAL ASSERTION: Total settled across BOTH batches must not exceed ₹500
    const totalSettled =
      resultA.summary.total_settled_amount + resultB.summary.total_settled_amount;
    expect(totalSettled).toBeLessThanOrEqual(MAX_OFFLINE_CUMULATIVE);
    expect(totalSettled).toBe(300); // Only Merchant A's ₹300 was settled
  });

  it('should settle up to exactly ₹500 across multiple batches', async () => {
    const now = Math.floor(Date.now() / 1000);

    // Batch 1: ₹200
    const sig1 = signTransaction(walletId, 200, 1, now, consumer.privateKeyObj);
    const r1 = await processSettlementBatch({
      merchant_id: 'TEST-M1',
      transactions: [{ wallet_id: walletId, amount: 200, sequence_counter: 1, timestamp: now, signature: sig1 }],
    });
    expect(r1.results[0].accepted).toBe(true);

    // Batch 2: ₹200
    const sig2 = signTransaction(walletId, 200, 2, now + 1, consumer.privateKeyObj);
    const r2 = await processSettlementBatch({
      merchant_id: 'TEST-M2',
      transactions: [{ wallet_id: walletId, amount: 200, sequence_counter: 2, timestamp: now + 1, signature: sig2 }],
    });
    expect(r2.results[0].accepted).toBe(true);

    // Batch 3: ₹100 (should succeed — total = ₹500)
    const sig3 = signTransaction(walletId, 100, 3, now + 2, consumer.privateKeyObj);
    const r3 = await processSettlementBatch({
      merchant_id: 'TEST-M3',
      transactions: [{ wallet_id: walletId, amount: 100, sequence_counter: 3, timestamp: now + 2, signature: sig3 }],
    });
    expect(r3.results[0].accepted).toBe(true);

    // Batch 4: ₹1 (should FAIL — cap exhausted)
    const sig4 = signTransaction(walletId, 1, 4, now + 3, consumer.privateKeyObj);
    const r4 = await processSettlementBatch({
      merchant_id: 'TEST-M4',
      transactions: [{ wallet_id: walletId, amount: 1, sequence_counter: 4, timestamp: now + 3, signature: sig4 }],
    });
    expect(r4.results[0].accepted).toBe(false);
    expect(r4.results[0].rejected_reason).toBe('EXCEEDS_CUMULATIVE_EXPOSURE_CAP');
  });
});

describe('Settlement Engine — Replay Attack Detection', () => {
  let walletId: string;
  let consumer: ReturnType<typeof generateConsumerKeyPair>;

  beforeAll(() => {
    loadBankKeys();
    consumer = generateConsumerKeyPair();
  });

  beforeEach(async () => {
    walletId = `${WALLET_ID_PREFIX}test-replay-${uuidv4()}`;
    await createTestWallet(consumer.publicKeyBase64, walletId);
    await issueCertificate(walletId, consumer.publicKeyBase64, MAX_OFFLINE_CUMULATIVE);
  });

  afterEach(async () => {
    await cleanupWallet(walletId);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should reject a transaction with the same sequence counter (replay)', async () => {
    const now = Math.floor(Date.now() / 1000);

    // First submission: sequence 1 (should succeed)
    const sig1 = signTransaction(walletId, 100, 1, now, consumer.privateKeyObj);
    const r1 = await processSettlementBatch({
      merchant_id: 'TEST-REPLAY-M1',
      transactions: [{ wallet_id: walletId, amount: 100, sequence_counter: 1, timestamp: now, signature: sig1 }],
    });
    expect(r1.results[0].accepted).toBe(true);

    // Second submission: same sequence 1 (REPLAY — should fail)
    const sig2 = signTransaction(walletId, 100, 1, now + 1, consumer.privateKeyObj);
    const r2 = await processSettlementBatch({
      merchant_id: 'TEST-REPLAY-M2',
      transactions: [{ wallet_id: walletId, amount: 100, sequence_counter: 1, timestamp: now + 1, signature: sig2 }],
    });
    expect(r2.results[0].accepted).toBe(false);
    expect(r2.results[0].rejected_reason).toBe('REPLAY_ATTACK_DETECTED');
  });

  it('should reject a transaction with a lower sequence counter', async () => {
    const now = Math.floor(Date.now() / 1000);

    // Submit sequence 5
    const sig1 = signTransaction(walletId, 100, 5, now, consumer.privateKeyObj);
    const r1 = await processSettlementBatch({
      merchant_id: 'TEST-REPLAY-M3',
      transactions: [{ wallet_id: walletId, amount: 100, sequence_counter: 5, timestamp: now, signature: sig1 }],
    });
    expect(r1.results[0].accepted).toBe(true);

    // Submit sequence 3 (lower — should fail)
    const sig2 = signTransaction(walletId, 50, 3, now + 1, consumer.privateKeyObj);
    const r2 = await processSettlementBatch({
      merchant_id: 'TEST-REPLAY-M4',
      transactions: [{ wallet_id: walletId, amount: 50, sequence_counter: 3, timestamp: now + 1, signature: sig2 }],
    });
    expect(r2.results[0].accepted).toBe(false);
    expect(r2.results[0].rejected_reason).toBe('REPLAY_ATTACK_DETECTED');
  });
});

describe('Settlement Engine — Expired Certificate Rejection', () => {
  let walletId: string;
  let consumer: ReturnType<typeof generateConsumerKeyPair>;

  beforeAll(() => {
    loadBankKeys();
    consumer = generateConsumerKeyPair();
  });

  beforeEach(async () => {
    walletId = `${WALLET_ID_PREFIX}test-expired-${uuidv4()}`;
    await createTestWallet(consumer.publicKeyBase64, walletId);
    // Issue a certificate that's ALREADY EXPIRED (expiry = 1 second in the past)
    const pastExpiry = Math.floor(Date.now() / 1000) - 1;
    await issueCertificate(walletId, consumer.publicKeyBase64, MAX_OFFLINE_CUMULATIVE, pastExpiry);
  });

  afterEach(async () => {
    await cleanupWallet(walletId);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should reject a transaction against an expired certificate', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sig = signTransaction(walletId, 100, 1, now, consumer.privateKeyObj);

    const result = await processSettlementBatch({
      merchant_id: 'TEST-EXPIRED-M1',
      transactions: [{
        wallet_id: walletId,
        amount: 100,
        sequence_counter: 1,
        timestamp: now,
        signature: sig,
      }],
    });

    expect(result.results[0].accepted).toBe(false);
    expect(result.results[0].rejected_reason).toBe('CERTIFICATE_EXPIRED');
  });
});
