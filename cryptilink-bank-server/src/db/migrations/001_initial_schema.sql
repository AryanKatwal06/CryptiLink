-- ═══════════════════════════════════════════════════════════════
-- CryptiLink Phase 1 — Initial Database Schema
-- ═══════════════════════════════════════════════════════════════
-- All tables are designed to be Neon-compatible (standard PostgreSQL).
-- Run this migration once against a fresh 'cryptilink' database.

-- ── Wallets ────────────────────────────────────────────────────
-- Each consumer registers one wallet containing their ECDSA public key.
-- The liquid_balance is a MOCK field for the prototype — in production,
-- this would be a real bank ledger integration.
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id       TEXT PRIMARY KEY,                  -- CL-VAULT-<uuid>
  public_key      TEXT NOT NULL,                     -- Base64-encoded ECDSA prime256v1 public key
  liquid_balance  NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Mock liquid account balance (₹)
  status          TEXT NOT NULL DEFAULT 'active'     -- 'active' | 'suspended'
    CHECK (status IN ('active', 'suspended')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Certificates ───────────────────────────────────────────────
-- Bank-signed certificate issued ONCE per "loading" event.
-- This is the reusable certificate cached by clients/merchants,
-- NOT sent per-transaction (that's the compact payload).
CREATE TABLE IF NOT EXISTS certificates (
  cert_id           SERIAL PRIMARY KEY,
  wallet_id         TEXT NOT NULL REFERENCES wallets(wallet_id),
  max_offline_limit NUMERIC(12, 2) NOT NULL,         -- Must be ≤ MAX_OFFLINE_CUMULATIVE (₹500)
  expiry_timestamp  BIGINT NOT NULL,                  -- Unix timestamp (seconds)
  bank_signature    TEXT NOT NULL,                     -- Base64 ECDSA-SHA256 signature
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked           BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_certificates_wallet ON certificates(wallet_id);

-- ── Escrow Ledger ──────────────────────────────────────────────
-- Tracks the bank-side liquid → escrow debit per wallet.
-- Each row is an immutable ledger entry.
CREATE TABLE IF NOT EXISTS escrow_ledger (
  entry_id      SERIAL PRIMARY KEY,
  wallet_id     TEXT NOT NULL REFERENCES wallets(wallet_id),
  amount        NUMERIC(12, 2) NOT NULL,              -- Amount moved to escrow (positive)
  running_escrow NUMERIC(12, 2) NOT NULL,             -- Running total in escrow for this wallet
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_wallet ON escrow_ledger(wallet_id);

-- ── Wallet Exposure ────────────────────────────────────────────
-- Tracks cumulative offline spending since last certificate issuance.
-- This is the table that enforces MAX_OFFLINE_CUMULATIVE at settlement.
-- Uses row-level locking (SELECT ... FOR UPDATE) during settlement.
CREATE TABLE IF NOT EXISTS wallet_exposure (
  wallet_id              TEXT PRIMARY KEY REFERENCES wallets(wallet_id),
  cumulative_exposure    NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- Running total spent offline
  last_sequence_counter  INTEGER NOT NULL DEFAULT 0,          -- For replay detection
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Settlement Batches ─────────────────────────────────────────
-- Tracks incoming settlement batches from merchants.
CREATE TABLE IF NOT EXISTS settlement_batches (
  batch_id     TEXT PRIMARY KEY,                     -- Server-generated UUID
  merchant_id  TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'processing'    -- 'processing' | 'completed' | 'failed'
    CHECK (status IN ('processing', 'completed', 'failed'))
);

-- ── Settled Transactions ───────────────────────────────────────
-- Individual transactions within a settlement batch.
-- Bad transactions are NOT silently dropped — they are recorded with
-- a rejected_reason so the merchant can display accurate UI.
CREATE TABLE IF NOT EXISTS settled_transactions (
  tx_id              SERIAL PRIMARY KEY,
  batch_id           TEXT NOT NULL REFERENCES settlement_batches(batch_id),
  wallet_id          TEXT NOT NULL,                    -- May reference a wallet that doesn't exist
  amount             NUMERIC(12, 2) NOT NULL,
  sequence_counter   INTEGER NOT NULL,
  consumer_signature TEXT NOT NULL,                    -- Base64 ECDSA signature from consumer
  timestamp          BIGINT NOT NULL,                  -- Unix timestamp from compact payload
  verified           BOOLEAN NOT NULL DEFAULT FALSE,
  rejected_reason    TEXT,                             -- NULL if verified, otherwise one of the RejectionReason values
  settled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settled_tx_batch ON settled_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_settled_tx_wallet ON settled_transactions(wallet_id);
