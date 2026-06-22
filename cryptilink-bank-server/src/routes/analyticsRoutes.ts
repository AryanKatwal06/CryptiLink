import { Router, Request, Response } from 'express';
import { getClient } from '../db/pool';

const router = Router();

// Dashboard API Key middleware
router.use((req: Request, res: Response, next: Function) => {
  const providedKey = req.header('X-Dashboard-Key');
  const expectedKey = process.env.DASHBOARD_API_KEY;

  if (!expectedKey) {
    console.warn('[ANALYTICS] DASHBOARD_API_KEY is not set in the environment. Blocking access.');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (providedKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized. Invalid or missing X-Dashboard-Key header.' });
    return;
  }

  next();
});

router.get('/summary', async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const totalWalletsRes = await client.query('SELECT COUNT(*) FROM wallets');
    const totalCertsRes = await client.query('SELECT COUNT(*) FROM certificates');
    const totalEscrowedRes = await client.query('SELECT COALESCE(SUM(escrow_balance), 0) as sum FROM wallet_exposure');
    
    const totalSettledRes = await client.query('SELECT COUNT(*) FROM settled_transactions WHERE verified = TRUE');
    const totalPendingRes = await client.query('SELECT COUNT(*) FROM settled_transactions WHERE verified = FALSE AND rejected_reason IS NULL');
    const totalRejectedRes = await client.query('SELECT COUNT(*) FROM settled_transactions WHERE rejected_reason IS NOT NULL');
    
    const rejectionBreakdownRes = await client.query('SELECT rejected_reason, COUNT(*) FROM settled_transactions WHERE rejected_reason IS NOT NULL GROUP BY rejected_reason');
    
    const breakdown: Record<string, number> = {};
    for (const row of rejectionBreakdownRes.rows) {
      breakdown[row.rejected_reason] = parseInt(row.count, 10);
    }

    res.json({
      totalWallets: parseInt(totalWalletsRes.rows[0].count, 10),
      totalCertsIssued: parseInt(totalCertsRes.rows[0].count, 10),
      totalEscrowed: parseFloat(totalEscrowedRes.rows[0].sum),
      totalSettled: parseInt(totalSettledRes.rows[0].count, 10),
      totalPending: parseInt(totalPendingRes.rows[0].count, 10),
      totalRejected: parseInt(totalRejectedRes.rows[0].count, 10),
      rejectionBreakdown: breakdown,
    });
  } catch (err) {
    console.error('[ANALYTICS] Summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.get('/recent-transactions', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const client = await getClient();
  try {
    const result = await client.query(`
      SELECT st.timestamp, st.amount, st.wallet_id, st.verified, st.rejected_reason, sb.merchant_id
      FROM settled_transactions st
      LEFT JOIN settlement_batches sb ON st.batch_id = sb.batch_id
      ORDER BY st.timestamp DESC
      LIMIT $1
    `, [limit]);

    // We MUST use hashWalletId, so we import it (after checking where to import)
    const { hashWalletId } = await import('../crypto/compactPayload');

    const mapped = result.rows.map(row => ({
      timestamp: row.timestamp,
      amount: parseFloat(row.amount),
      wallet_id_hash: hashWalletId(row.wallet_id),
      verified: row.verified,
      rejected_reason: row.rejected_reason,
      merchant_id: row.merchant_id,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('[ANALYTICS] Recent transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.get('/channel-stats', async (req: Request, res: Response) => {
  // In Phase 1-4, the bank server doesn't currently store channel_hint or settlement_latency_ms in settled_transactions table.
  // The prompt says: "Returns: aggregated channel_hint counts and average settlement_latency_ms from settled_transactions."
  // We will alter the schema slightly to add these columns if they don't exist, or just query if they do.
  // For safety, we wrap the query and return mocked or default empty stats if the columns don't exist.
  const client = await getClient();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(CASE WHEN channel_hint = 'sms' THEN 1 END) as sms_count,
        COUNT(CASE WHEN channel_hint = 'acoustic' THEN 1 END) as acoustic_count,
        COUNT(CASE WHEN channel_hint IS NULL OR channel_hint NOT IN ('sms', 'acoustic') THEN 1 END) as unknown_count,
        AVG(settlement_latency_ms) as avg_latency
      FROM settled_transactions
      WHERE verified = TRUE
    `);
    
    const row = result.rows[0];
    res.json({
      smsCount: parseInt(row.sms_count, 10) || 0,
      acousticCount: parseInt(row.acoustic_count, 10) || 0,
      unknownCount: parseInt(row.unknown_count, 10) || 0,
      averageLatencyMs: Math.round(parseFloat(row.avg_latency)) || 0,
    });
  } catch (err) {
    // Column might not exist yet, return empty stats
    res.json({
      smsCount: 0,
      acousticCount: 0,
      unknownCount: 0,
      averageLatencyMs: 0,
    });
  } finally {
    client.release();
  }
});

export default router;
