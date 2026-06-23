/**
 * CryptiLink Phase 4 — SQLCipher Database Manager
 *
 * Central database for the merchant-side app. Uses SQLCipher-backed
 * SQLite for encrypted local storage of:
 *
 * 1. Certificate cache (wallet_id_hash → full certificate)
 * 2. Replay counters (anti-replay sequence tracking per wallet)
 * 3. Merchant configuration (merchant_id, bank public key, etc.)
 * 4. Transaction ledger (OFFLINE_VERIFIED / SETTLED / SETTLEMENT_REJECTED)
 * 5. Rejected transaction log (failed verification attempts)
 *
 * SECURITY NOTE: The database encryption key should be derived from
 * device-specific secure storage (Android Keystore). For the prototype,
 * we use a hardcoded key — production MUST replace this.
 */

import SQLite from 'react-native-sqlcipher-storage';

// ═══════════════════════════════════════════════════════════════
// DATABASE ENCRYPTION — PROTOTYPE ONLY
// In production, derive this from Android Keystore or Secure Enclave
// ═══════════════════════════════════════════════════════════════
const DB_NAME = 'cryptilink_merchant.db';
const DB_ENCRYPTION_KEY =
  process.env.MERCHANT_DB_KEY ||
  'CRYPTILINK_PROTOTYPE_KEY_REPLACE_IN_PRODUCTION'; // PROTOTYPE FALLBACK — NEVER USE
                                                    // IN PRODUCTION. Set
                                                    // MERCHANT_DB_KEY env var.

/** Transaction status lifecycle: OFFLINE_VERIFIED → SETTLED | SETTLEMENT_REJECTED */
export type TransactionStatus =
  | 'OFFLINE_VERIFIED'
  | 'SETTLED'
  | 'SETTLEMENT_REJECTED';

/** The channel a transaction was received on */
export type TransportChannel = 'SMS' | 'ACOUSTIC';

/** A cached certificate entry */
export interface CachedCertificate {
  walletIdHash: string;
  walletId: string;
  certificateJson: string;
  cachedAt: number;
}

/** A merchant transaction record */
export interface MerchantTransaction {
  id: number;
  walletIdHash: string;
  walletId: string | null;
  amount: number;
  sequenceCounter: number;
  signature: string;
  channel: TransportChannel;
  timestamp: number;
  receivedAt: number;
  status: TransactionStatus;
  settlementBatchId: string | null;
  rejectionReason: string | null;
  verificationChecks: string | null;
}

/** A rejected transaction attempt */
export interface RejectedTransaction {
  id: number;
  walletIdHash: string;
  amount: number;
  sequenceCounter: number;
  channel: TransportChannel;
  timestamp: number;
  receivedAt: number;
  failedCheck: string;
  rejectionReason: string;
  rawPayload: string | null;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Opens or returns the existing database connection.
 * Creates all tables on first open.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabase({
    name: DB_NAME,
    key: DB_ENCRYPTION_KEY,
    location: 'default',
  });

  await initializeTables(dbInstance);
  return dbInstance;
}

/**
 * Closes the database connection. Call on app shutdown.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Creates all required tables if they don't exist.
 * Uses a single transaction for atomicity.
 */
async function initializeTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.transaction((tx) => {
    // ── Certificate cache ─────────────────────────────────────────
    // Maps wallet_id_hash → full certificate for offline verification.
    // Phase 3's compact payload only carries the hash — the merchant
    // must have cached the full cert from a prior CERT_SYNC exchange.
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS cert_cache (
        wallet_id_hash TEXT PRIMARY KEY,
        wallet_id      TEXT NOT NULL,
        certificate_json TEXT NOT NULL,
        cached_at      INTEGER NOT NULL
      );
    `);

    // ── Replay counters ───────────────────────────────────────────
    // Tracks the last seen sequence counter per wallet at THIS merchant.
    // This catches replays against THIS merchant only — cross-merchant
    // replay detection happens at the bank during settlement.
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS replay_counters (
        wallet_id_hash  TEXT PRIMARY KEY,
        last_sequence   INTEGER NOT NULL DEFAULT 0
      );
    `);

    // ── Merchant configuration ────────────────────────────────────
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS merchant_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // ── Transaction ledger ────────────────────────────────────────
    // The merchant's source of truth for "what do I think I'm owed."
    //
    // STATUS LIFECYCLE (THIS IS THE CRITICAL DISTINCTION):
    //   OFFLINE_VERIFIED  — passed local 4-check verifier, NOT yet
    //                       confirmed by bank. Merchant CANNOT treat
    //                       this as settled money.
    //   SETTLED           — bank confirmed payment in settlement batch.
    //                       This is the ONLY state that means "you got paid."
    //   SETTLEMENT_REJECTED — bank rejected this transaction during
    //                       settlement. Merchant must be clearly notified.
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS merchant_transactions (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id_hash      TEXT NOT NULL,
        wallet_id           TEXT,
        amount              REAL NOT NULL,
        sequence_counter    INTEGER NOT NULL,
        signature           TEXT NOT NULL,
        channel             TEXT NOT NULL CHECK (channel IN ('SMS', 'ACOUSTIC')),
        timestamp           INTEGER NOT NULL,
        received_at         INTEGER NOT NULL,
        status              TEXT NOT NULL DEFAULT 'OFFLINE_VERIFIED'
          CHECK (status IN ('OFFLINE_VERIFIED', 'SETTLED', 'SETTLEMENT_REJECTED')),
        settlement_batch_id TEXT,
        rejection_reason    TEXT,
        verification_checks TEXT
      );
    `);

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_merchant_tx_status
        ON merchant_transactions(status);
    `);

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_merchant_tx_wallet
        ON merchant_transactions(wallet_id_hash);
    `);

    // ── Rejected transactions log ─────────────────────────────────
    // Failed verification attempts are NEVER silently discarded.
    // They're stored for the merchant's records and debugging.
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS rejected_transactions (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id_hash    TEXT NOT NULL,
        amount            REAL NOT NULL,
        sequence_counter  INTEGER NOT NULL,
        channel           TEXT NOT NULL CHECK (channel IN ('SMS', 'ACOUSTIC')),
        timestamp         INTEGER NOT NULL,
        received_at       INTEGER NOT NULL,
        failed_check      TEXT NOT NULL,
        rejection_reason  TEXT NOT NULL,
        raw_payload       TEXT
      );
    `);
  });
}

// ═══════════════════════════════════════════════════════════════
// CONFIG HELPERS
// ═══════════════════════════════════════════════════════════════

/** Gets a config value by key */
export async function getConfig(key: string): Promise<string | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT value FROM merchant_config WHERE key = ?',
    [key],
  );
  if (results.rows.length === 0) return null;
  return results.rows.item(0).value;
}

/** Sets a config value (upsert) */
export async function setConfig(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.executeSql(
    `INSERT OR REPLACE INTO merchant_config (key, value) VALUES (?, ?)`,
    [key, value],
  );
}

// ═══════════════════════════════════════════════════════════════
// CERT CACHE HELPERS
// ═══════════════════════════════════════════════════════════════

/** Looks up a cached certificate by wallet_id_hash */
export async function getCachedCertificate(
  walletIdHash: string,
): Promise<CachedCertificate | null> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM cert_cache WHERE wallet_id_hash = ?',
    [walletIdHash],
  );
  if (results.rows.length === 0) return null;
  const row = results.rows.item(0);
  return {
    walletIdHash: row.wallet_id_hash,
    walletId: row.wallet_id,
    certificateJson: row.certificate_json,
    cachedAt: row.cached_at,
  };
}

/** Caches a certificate for a wallet */
export async function cacheCertificate(
  walletIdHash: string,
  walletId: string,
  certificateJson: string,
): Promise<void> {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);
  await db.executeSql(
    `INSERT OR REPLACE INTO cert_cache
     (wallet_id_hash, wallet_id, certificate_json, cached_at)
     VALUES (?, ?, ?, ?)`,
    [walletIdHash, walletId, certificateJson, now],
  );
}

// ═══════════════════════════════════════════════════════════════
// REPLAY COUNTER HELPERS
// ═══════════════════════════════════════════════════════════════

/** Gets the last seen sequence counter for a wallet */
export async function getLastSequence(walletIdHash: string): Promise<number> {
  const db = await getDatabase();
  const [results] = await db.executeSql(
    'SELECT last_sequence FROM replay_counters WHERE wallet_id_hash = ?',
    [walletIdHash],
  );
  if (results.rows.length === 0) return 0;
  return results.rows.item(0).last_sequence;
}

/** Updates the last seen sequence counter for a wallet */
export async function updateLastSequence(
  walletIdHash: string,
  sequence: number,
): Promise<void> {
  const db = await getDatabase();
  await db.executeSql(
    `INSERT OR REPLACE INTO replay_counters (wallet_id_hash, last_sequence)
     VALUES (?, ?)`,
    [walletIdHash, sequence],
  );
}
