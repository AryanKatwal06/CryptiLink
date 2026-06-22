/**
 * CryptiLink — Bank Routes
 *
 * Exposes the bank's ECDSA public key so consumer/merchant apps
 * can verify certificates offline.
 */

import { Router, Request, Response } from 'express';
import { getBankPublicKeyPem } from '../crypto/bankKeys';

const router = Router();

/**
 * GET /api/v1/bank/public-key
 *
 * Returns the bank's ECDSA public key in PEM format.
 * Consumer and merchant apps should fetch this once and cache it.
 */
router.get('/public-key', (_req: Request, res: Response) => {
  try {
    const publicKeyPem = getBankPublicKeyPem();
    res.json({
      public_key: publicKeyPem,
      algorithm: 'ECDSA',
      curve: 'prime256v1 (secp256r1 / P-256)',
      format: 'SPKI PEM',
    });
  } catch (err) {
    console.error('[BANK ROUTE] Error fetching public key:', err);
    res.status(500).json({ error: 'Bank keys not initialized' });
  }
});

export default router;
