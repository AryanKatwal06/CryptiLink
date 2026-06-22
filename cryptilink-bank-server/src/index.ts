/**
 * CryptiLink Bank Server — Entry Point
 *
 * Express server for the CryptiLink offline payment protocol backend.
 */

import express from 'express';
import { config } from './config';
import { loadBankKeys } from './crypto/bankKeys';
import bankRoutes from './routes/bankRoutes';
import walletRoutes from './routes/walletRoutes';
import settlementRoutes from './routes/settlementRoutes';

const app = express();

// ── Middleware ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Health check ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cryptilink-bank-server', version: '1.0.0' });
});

// ── API Routes ──────────────────────────────────────────────────
app.use('/api/v1/bank', bankRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/settle', settlementRoutes);

// ── Start server ────────────────────────────────────────────────
async function start(): Promise<void> {
  // Load or generate the bank's ECDSA keypair
  loadBankKeys();

  app.listen(config.port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CryptiLink Bank Server — Phase 1');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  🏦 Server running on http://localhost:${config.port}`);
    console.log(`  🔑 Bank keys: ${config.bankPrivateKeyPath}`);
    console.log(`  🗄️  Database: ${config.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    GET  /api/v1/bank/public-key`);
    console.log(`    POST /api/v1/wallet/register`);
    console.log(`    POST /api/v1/wallet/:walletId/load`);
    console.log(`    POST /api/v1/settle`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  });
}

// Export for testing
export { app };

// Only start if run directly (not imported for tests)
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
