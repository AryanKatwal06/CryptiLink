/**
 * CryptiLink Phase 4 — Dual Merchant Settlement Integration Test
 *
 * This test reproduces the exact liability gap scenario from the security review:
 * 1. A consumer has a ₹500 offline limit.
 * 2. They spend ₹300 at Merchant A. It is OFFLINE_VERIFIED locally.
 * 3. They spend ₹300 at Merchant B. It is OFFLINE_VERIFIED locally.
 * 4. Both merchants submit their batches to the bank server.
 * 5. One succeeds. The other MUST fail with EXCEEDS_CUMULATIVE_EXPOSURE_CAP.
 * 6. The bank server returns the rejection, allowing the merchant app
 *    to correctly transition it from OFFLINE_VERIFIED to SETTLEMENT_REJECTED.
 */

import { processSettlementBatch } from '../services/settlement';
import { loadBankKeys } from '../crypto/bankKeys';
import { signCertificate } from '../crypto/signing';
import { hashWalletId, signCompactPayloadData } from '../crypto/compactPayload';
import { pool, query } from '../db/pool';
import { CertificatePayload } from '../types/certificate';
import { WALLET_ID_PREFIX, MAX_OFFLINE_CUMULATIVE } from '../config';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Setup/teardown mimics settlement.integration.test.ts
beforeAll(() => {
  loadBankKeys();
});

afterAll(async () => {
  await pool.end();
});

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

async function setupTestWallet(walletId: string, publicKeyBase64: string) {
  await query(
    `INSERT INTO wallets (wallet_id, public_key, liquid_balance, status) VALUES ($1, $2, 10000, 'active')
     ON CONFLICT (wallet_id) DO NOTHING`,
    [walletId, publicKeyBase64]
  );
  await query(
    `INSERT INTO wallet_exposure (wallet_id, cumulative_exposure, last_sequence_counter) VALUES ($1, 0, 0)
     ON CONFLICT (wallet_id) DO NOTHING`,
    [walletId]
  );
  
  const now = Math.floor(Date.now() / 1000);
  const payload: CertificatePayload = {
    version: 1,
    wallet_id: walletId,
    public_key: publicKeyBase64,
    max_offline_limit: MAX_OFFLINE_CUMULATIVE,
    expiry: now + 3600,
  };
  const signed = signCertificate(payload);
  
  await query(
    `INSERT INTO certificates (wallet_id, max_offline_limit, expiry_timestamp, bank_signature)
     VALUES ($1, $2, $3, $4)`,
    [walletId, MAX_OFFLINE_CUMULATIVE, payload.expiry, signed.bank_signature]
  );
  await query(
    `INSERT INTO escrow_ledger (wallet_id, amount, running_escrow) VALUES ($1, $2, $2)`,
    [walletId, MAX_OFFLINE_CUMULATIVE]
  );
}

describe('Phase 4 — Dual Merchant Liability Test', () => {
  it('rejects the second merchant batch that exceeds cumulative limit', async () => {
    const consumer = generateConsumerKeyPair();
    const walletId = `${WALLET_ID_PREFIX}dual-test-${uuidv4()}`;
    await setupTestWallet(walletId, consumer.publicKeyBase64);

    const now = Math.floor(Date.now() / 1000);

    // Transaction 1: ₹300 at Merchant A
    const sigA = signCompactPayloadData(
      { walletIdHash: hashWalletId(walletId), amount: 300, sequenceCounter: 1, timestamp: now },
      consumer.privateKeyObj
    );
    
    // Transaction 2: ₹300 at Merchant B (different sequence, valid locally)
    const sigB = signCompactPayloadData(
      { walletIdHash: hashWalletId(walletId), amount: 300, sequenceCounter: 2, timestamp: now + 1 },
      consumer.privateKeyObj
    );

    // Both merchants submit their batches to the bank
    const resultA = await processSettlementBatch({
      merchant_id: 'MERCHANT-A',
      transactions: [{ wallet_id: walletId, amount: 300, sequence_counter: 1, timestamp: now, signature: sigA }],
    });

    const resultB = await processSettlementBatch({
      merchant_id: 'MERCHANT-B',
      transactions: [{ wallet_id: walletId, amount: 300, sequence_counter: 2, timestamp: now + 1, signature: sigB }],
    });

    // One succeeds, one fails
    expect(resultA.results[0].accepted).toBe(true);
    
    expect(resultB.results[0].accepted).toBe(false);
    expect(resultB.results[0].rejected_reason).toBe('EXCEEDS_CUMULATIVE_EXPOSURE_CAP');
    
    // Total settled is ₹300, never ₹600
    expect(resultA.summary.total_settled_amount + resultB.summary.total_settled_amount).toBe(300);
  });
});
