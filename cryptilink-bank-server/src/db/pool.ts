/**
 * CryptiLink — PostgreSQL Connection Pool
 */

import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Log pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a query against the pool.
 * Convenience wrapper for pool.query with proper typing.
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<import('pg').QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Get a dedicated client from the pool for transaction use.
 * IMPORTANT: Always release the client in a finally block.
 */
export async function getClient(): Promise<import('pg').PoolClient> {
  return pool.connect();
}
