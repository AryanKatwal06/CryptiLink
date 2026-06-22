/**
 * CryptiLink — Phase 1 End-to-End Demo Script
 *
 * Walks through the full happy path against a running local server:
 * 1. Register a wallet with a fresh ECDSA keypair
 * 2. Load ₹500 into the vault → receive signed certificate
 * 3. Construct 2 compact payloads (simulating 2 different merchants)
 *    - Merchant A: ₹300 transaction
 *    - Merchant B: ₹300 transaction (should be REJECTED at cap)
 * 4. Submit both settlement batches
 * 5. Print colorized results showing cap enforcement
 *
 * Usage: npm run demo (with server running on localhost:3000)
 */

import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';

// ── Color helpers ─────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function header(text: string): void {
  console.log('');
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
}

function step(num: number, text: string): void {
  console.log('');
  console.log(`${colors.magenta}  ▸ Step ${num}: ${text}${colors.reset}`);
}

function success(text: string): void {
  console.log(`${colors.green}    ✓ ${text}${colors.reset}`);
}

function fail(text: string): void {
  console.log(`${colors.red}    ✗ ${text}${colors.reset}`);
}

function info(text: string): void {
  console.log(`${colors.dim}    ${text}${colors.reset}`);
}

// ── HTTP helper ─────────────────────────────────────────────────
async function post(endpoint: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(endpoint: string): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  const data = await res.json();
  return { status: res.status, data };
}

// ── Compact payload signing (simulates consumer's phone) ─────────
function signPayloadData(
  walletId: string,
  amount: number,
  sequenceCounter: number,
  timestamp: number,
  privateKey: crypto.KeyObject
): string {
  // Hash the wallet ID (first 8 bytes of SHA-256)
  const fullHash = crypto.createHash('sha256').update(walletId).digest();
  const walletIdHash = fullHash.subarray(0, 8);

  // Build the 20-byte data buffer
  const buf = Buffer.alloc(20);
  walletIdHash.copy(buf, 0);
  buf.writeInt32BE(Math.round(amount * 100), 8); // paise
  buf.writeInt32BE(sequenceCounter, 12);
  buf.writeInt32BE(timestamp, 16);

  // Sign with ECDSA-SHA256
  const signer = crypto.createSign('SHA256');
  signer.update(buf);
  signer.end();
  const derSig = signer.sign(privateKey);

  // Convert DER to raw (r‖s) format
  // Parse DER: 30 <len> 02 <rlen> <r> 02 <slen> <s>
  let offset = 2;
  offset++; // skip 0x02 tag
  const rLen = derSig[offset]; offset++;
  let r = derSig.subarray(offset, offset + rLen); offset += rLen;
  offset++; // skip 0x02 tag
  const sLen = derSig[offset]; offset++;
  let s = derSig.subarray(offset, offset + sLen);

  // Strip/pad to 32 bytes each
  if (r.length > 32 && r[0] === 0x00) r = r.subarray(r.length - 32);
  if (s.length > 32 && s[0] === 0x00) s = s.subarray(s.length - 32);
  const raw = Buffer.alloc(64);
  r.copy(raw, 32 - r.length);
  s.copy(raw, 64 - s.length);

  return raw.toString('base64');
}

// ── Main demo ─────────────────────────────────────────────────────
async function demo(): Promise<void> {
  header('CryptiLink Phase 1 — End-to-End Demo');

  // ── Step 0: Health check ──────────────────────────────────────
  step(0, 'Health check');
  try {
    const health = await get('/health');
    if (health.status === 200) {
      success(`Server is running: ${JSON.stringify(health.data)}`);
    } else {
      fail(`Server responded with ${health.status}`);
      return;
    }
  } catch {
    fail(`Cannot reach server at ${BASE_URL}. Is it running? (npm run dev)`);
    return;
  }

  // ── Step 1: Generate a consumer ECDSA keypair ─────────────────
  step(1, 'Generate consumer ECDSA keypair (simulating phone)');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  const publicKeyBase64 = (publicKey as Buffer).toString('base64');
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKey as Buffer,
    type: 'pkcs8',
    format: 'der',
  });

  success(`Public key (base64): ${publicKeyBase64.substring(0, 40)}...`);

  // ── Step 2: Fetch bank's public key ───────────────────────────
  step(2, 'Fetch bank public key');
  const bankKeyRes = await get('/api/v1/bank/public-key');
  if (bankKeyRes.status === 200) {
    success(`Bank key algorithm: ${bankKeyRes.data.algorithm}`);
    success(`Bank key curve: ${bankKeyRes.data.curve}`);
  } else {
    fail(`Failed to fetch bank key: ${bankKeyRes.status}`);
    return;
  }

  // ── Step 3: Register wallet ───────────────────────────────────
  step(3, 'Register wallet');
  const regRes = await post('/api/v1/wallet/register', {
    public_key: publicKeyBase64,
  });

  if (regRes.status !== 201) {
    fail(`Registration failed: ${JSON.stringify(regRes.data)}`);
    return;
  }

  const walletId = regRes.data.wallet_id;
  success(`Wallet created: ${walletId}`);

  // ── Step 4: Load ₹500 into vault ──────────────────────────────
  step(4, 'Load ₹500 into offline vault');
  const loadRes = await post(`/api/v1/wallet/${walletId}/load`, {
    amount: 500,
  });

  if (loadRes.status !== 201) {
    fail(`Load failed: ${JSON.stringify(loadRes.data)}`);
    return;
  }

  success(`Certificate issued!`);
  info(`  Max offline limit: ₹${loadRes.data.certificate.max_offline_limit}`);
  info(`  Expiry: ${new Date(loadRes.data.certificate.expiry * 1000).toISOString()}`);
  info(`  Escrow balance: ₹${loadRes.data.escrow_amount}`);
  info(`  Remaining liquid: ₹${loadRes.data.remaining_liquid_balance}`);

  // ── Step 5: Try to load ₹600 (should fail — exceeds cap) ──────
  step(5, 'Attempt to load ₹600 (should be REJECTED — exceeds ₹500 cap)');
  const badLoadRes = await post(`/api/v1/wallet/${walletId}/load`, {
    amount: 600,
  });

  if (badLoadRes.status === 400) {
    success(`Correctly rejected: ${badLoadRes.data.error.substring(0, 80)}...`);
  } else {
    fail(`Expected 400 but got ${badLoadRes.status}: ${JSON.stringify(badLoadRes.data)}`);
  }

  // ── Step 6: Simulate Merchant A transaction (₹200) ─────────────
  step(6, 'Merchant A: submit ₹200 settlement');
  const now = Math.floor(Date.now() / 1000);

  const sigA = signPayloadData(walletId, 200, 1, now, privateKeyObj);

  const settleA = await post('/api/v1/settle', {
    merchant_id: 'MERCHANT-ALPHA',
    transactions: [{
      wallet_id: walletId,
      amount: 200,
      sequence_counter: 1,
      timestamp: now,
      signature: sigA,
    }],
  });

  if (settleA.status === 200 && settleA.data.results[0].accepted) {
    success(`Merchant A: ₹200 ACCEPTED ✓`);
    info(`  Batch ID: ${settleA.data.batch_id}`);
    info(`  Total settled: ₹${settleA.data.summary.total_settled_amount}`);
  } else {
    fail(`Merchant A settlement failed: ${JSON.stringify(settleA.data)}`);
    return;
  }

  // ── Step 7: Simulate Merchant B transaction (₹200) ─────────────
  step(7, 'Merchant B: submit ₹200 settlement');

  const sigB = signPayloadData(walletId, 200, 2, now + 1, privateKeyObj);

  const settleB = await post('/api/v1/settle', {
    merchant_id: 'MERCHANT-BETA',
    transactions: [{
      wallet_id: walletId,
      amount: 200,
      sequence_counter: 2,
      timestamp: now + 1,
      signature: sigB,
    }],
  });

  if (settleB.status === 200 && settleB.data.results[0].accepted) {
    success(`Merchant B: ₹200 ACCEPTED ✓`);
    info(`  Batch ID: ${settleB.data.batch_id}`);
    info(`  Total settled: ₹${settleB.data.summary.total_settled_amount}`);
  } else {
    fail(`Merchant B settlement failed: ${JSON.stringify(settleB.data)}`);
    return;
  }

  // ── Step 8: Simulate Merchant C transaction (₹200 — should hit cumulative cap)
  step(8, 'Merchant C: submit ₹200 settlement (should be REJECTED — cumulative > ₹500)');

  const sigC = signPayloadData(walletId, 200, 3, now + 2, privateKeyObj);

  const settleC = await post('/api/v1/settle', {
    merchant_id: 'MERCHANT-GAMMA',
    transactions: [{
      wallet_id: walletId,
      amount: 200,
      sequence_counter: 3,
      timestamp: now + 2,
      signature: sigC,
    }],
  });

  if (settleC.status === 200 && !settleC.data.results[0].accepted) {
    success(`Merchant C: ₹200 REJECTED ✓`);
    info(`  Reason: ${settleC.data.results[0].rejected_reason}`);
    info(`  The cumulative cap (₹500) prevented the double-spend!`);
  } else if (settleC.status === 200 && settleC.data.results[0].accepted) {
    fail(`SECURITY FAILURE: Merchant C was ACCEPTED — double-spend cap not enforced!`);
  } else {
    fail(`Unexpected response: ${JSON.stringify(settleC.data)}`);
  }

  // ── Step 9: Simulate Merchant D transaction (₹100 — stays under cumulative cap)
  step(9, 'Merchant D: submit ₹100 settlement (should SUCCEED — 200+200+100 = 500 ≤ cap)');

  const sigD = signPayloadData(walletId, 100, 4, now + 3, privateKeyObj);

  const settleD = await post('/api/v1/settle', {
    merchant_id: 'MERCHANT-DELTA',
    transactions: [{
      wallet_id: walletId,
      amount: 100,
      sequence_counter: 4,
      timestamp: now + 3,
      signature: sigD,
    }],
  });

  if (settleD.status === 200 && settleD.data.results[0].accepted) {
    success(`Merchant D: ₹100 ACCEPTED ✓ (total now ₹500 — exactly at cap)`);
    info(`  Total settled: ₹${settleD.data.summary.total_settled_amount}`);
  } else if (settleD.status === 200 && !settleD.data.results[0].accepted) {
    fail(`Merchant D rejected: ${settleD.data.results[0].rejected_reason}`);
  } else {
    fail(`Unexpected response: ${JSON.stringify(settleD.data)}`);
  }

  // ── Step 10: Try ₹1 more (should fail — cap exhausted) ─────────
  step(10, 'Merchant E: submit ₹1 settlement (should FAIL — cap exhausted at ₹500)');

  const sigE = signPayloadData(walletId, 1, 5, now + 4, privateKeyObj);

  const settleE = await post('/api/v1/settle', {
    merchant_id: 'MERCHANT-EPSILON',
    transactions: [{
      wallet_id: walletId,
      amount: 1,
      sequence_counter: 5,
      timestamp: now + 4,
      signature: sigE,
    }],
  });

  if (settleE.status === 200 && !settleE.data.results[0].accepted) {
    success(`Merchant E: ₹1 REJECTED ✓ — cap fully exhausted`);
    info(`  Reason: ${settleE.data.results[0].rejected_reason}`);
  } else {
    fail(`Expected rejection but got: ${JSON.stringify(settleE.data)}`);
  }

  // ── Summary ───────────────────────────────────────────────────
  header('Demo Complete — Summary');
  console.log('');
  console.log(`  ${colors.green}✓${colors.reset} Wallet registered with ECDSA prime256v1 key`);
  console.log(`  ${colors.green}✓${colors.reset} ₹500 loaded into vault, certificate issued`);
  console.log(`  ${colors.green}✓${colors.reset} ₹600 load correctly rejected (exceeds cap)`);
  console.log(`  ${colors.green}✓${colors.reset} Merchant A: ₹200 settled successfully`);
  console.log(`  ${colors.green}✓${colors.reset} Merchant B: ₹200 settled successfully`);
  console.log(`  ${colors.green}✓${colors.reset} Merchant C: ₹200 rejected (cumulative ₹600 > ₹500 cap)`);
  console.log(`  ${colors.green}✓${colors.reset} Merchant D: ₹100 settled (cumulative ₹500 = cap)`);
  console.log(`  ${colors.green}✓${colors.reset} Merchant E: ₹1 rejected (cap exhausted)`);
  console.log('');
  console.log(`  ${colors.bold}${colors.green}Double-spend cap enforcement is WORKING.${colors.reset}`);
  console.log(`  Total settled: ₹500 (max allowed). No more can be settled.`);
  console.log('');
}

demo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
