/**
 * CryptiLink — Wallet Routes
 *
 * Handles wallet registration and certificate issuance (fund loading).
 */

import { Router, Request, Response } from 'express';
import { registerWallet } from '../services/walletService';
import { loadFundsAndIssueCertificate } from '../services/certificateService';
import { MAX_OFFLINE_CUMULATIVE } from '../config';

const router = Router();

/**
 * POST /api/v1/wallet/register
 *
 * Registers a new wallet with the consumer's ECDSA public key.
 *
 * Request body:
 * {
 *   "public_key": "<base64 SPKI DER encoded ECDSA prime256v1 public key>"
 * }
 *
 * Response:
 * {
 *   "wallet_id": "CL-VAULT-<uuid>",
 *   "status": "active",
 *   "created_at": "..."
 * }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { public_key } = req.body;

    if (!public_key || typeof public_key !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid public_key. Provide a base64-encoded SPKI DER ECDSA public key (prime256v1/secp256r1).',
      });
      return;
    }

    const result = await registerWallet(public_key);

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Key validation errors are 400, everything else is 500
    if (message.includes('Invalid')) {
      res.status(400).json({ error: message });
    } else {
      console.error('[WALLET ROUTE] Registration error:', err);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  }
});

/**
 * POST /api/v1/wallet/:walletId/load
 *
 * Loads funds into a wallet's offline vault and issues a signed certificate.
 *
 * Request body:
 * {
 *   "amount": 500  // Amount in ₹, must be ≤ MAX_OFFLINE_CUMULATIVE
 * }
 *
 * Response: SignedCertificate JSON
 */
router.post('/:walletId/load', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== 'number' || isNaN(amount)) {
      res.status(400).json({
        error: `Missing or invalid amount. Provide a numeric amount in ₹ (max ₹${MAX_OFFLINE_CUMULATIVE}).`,
      });
      return;
    }

    const result = await loadFundsAndIssueCertificate(walletId, amount);

    res.status(201).json({
      certificate: result.certificate,
      escrow_amount: result.escrow_amount,
      remaining_liquid_balance: result.remaining_liquid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('exceeds') || message.includes('Exceeds') || message.includes('greater than 0')) {
      res.status(400).json({ error: message });
    } else if (message.includes('not found') || message.includes('Not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('Insufficient')) {
      res.status(400).json({ error: message });
    } else if (message.includes('suspended')) {
      res.status(403).json({ error: message });
    } else {
      console.error('[WALLET ROUTE] Load error:', err);
      res.status(500).json({ error: 'Internal server error during fund loading' });
    }
  }
});

export default router;
