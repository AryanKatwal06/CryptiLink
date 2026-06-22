/**
 * CryptiLink — Database Seed Script
 *
 * Seeds the database with test data for development.
 * Run after migrations: npm run seed
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { pool, query } from '../src/db/pool';

async function seed(): Promise<void> {
  console.log('[SEED] Starting database seed...');

  // The wallets are created via the API (register endpoint).
  // This seed script just confirms the database is reachable
  // and the schema is in place.

  try {
    const result = await query('SELECT COUNT(*) as count FROM wallets');
    console.log(`[SEED] ✓ Database connection OK`);
    console.log(`[SEED]   Current wallet count: ${result.rows[0].count}`);
    console.log('[SEED] ✓ Seed complete (wallets are created via the register API)');
  } catch (err) {
    console.error('[SEED] ✗ Database error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
