/**
 * CryptiLink — Database Migration Runner
 *
 * Reads and executes SQL migration files in order.
 * For the prototype, this is a simple sequential runner.
 */

import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[MIGRATE] Found ${files.length} migration file(s)`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[MIGRATE] Running: ${file}`);
    try {
      await pool.query(sql);
      console.log(`[MIGRATE] ✓ ${file} completed`);
    } catch (err) {
      console.error(`[MIGRATE] ✗ ${file} failed:`, err);
      throw err;
    }
  }

  console.log('[MIGRATE] All migrations complete');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('[MIGRATE] Fatal error:', err);
  process.exit(1);
});
