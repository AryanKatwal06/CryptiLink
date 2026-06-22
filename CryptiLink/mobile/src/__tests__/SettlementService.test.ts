/**
 * CryptiLink Phase 4 — Settlement Service Unit Tests
 */

import { submitPendingForSettlement } from '../services/SettlementService';
import { getPendingTransactions, applySettlementResults } from '../db/TransactionLedger';
import { getMerchantId, getBankUrl } from '../services/MerchantOnboarding';
import { encryptSettlementBatch } from '../crypto/aesEncrypt';
import { Vibration } from 'react-native';

jest.mock('../db/TransactionLedger', () => ({
  getPendingTransactions: jest.fn(),
  applySettlementResults: jest.fn(),
}));

jest.mock('../services/MerchantOnboarding', () => ({
  getMerchantId: jest.fn(),
  getBankUrl: jest.fn(),
}));

jest.mock('../crypto/aesEncrypt', () => ({
  encryptSettlementBatch: jest.fn(),
}));

jest.mock('react-native', () => ({
  Vibration: { vibrate: jest.fn() },
}));

describe('SettlementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMerchantId as jest.Mock).mockResolvedValue('TEST-MERCHANT');
    (getBankUrl as jest.Mock).mockResolvedValue('http://localhost:3000');
    (encryptSettlementBatch as jest.Mock).mockResolvedValue({ encrypted: true });
    
    global.fetch = jest.fn() as jest.Mock;
  });

  it('submits pending transactions and updates ledger on success', async () => {
    (getPendingTransactions as jest.Mock).mockResolvedValue([{ id: 1, amount: 100 }]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        batch_id: 'BATCH-1',
        results: [{ index: 0, accepted: true }],
        summary: { total: 1, accepted: 1, rejected: 0 }
      })
    });
    (applySettlementResults as jest.Mock).mockResolvedValue({ settled: 1, rejected: 0 });

    const result = await submitPendingForSettlement();

    expect(result?.batch_id).toBe('BATCH-1');
    expect(applySettlementResults).toHaveBeenCalledWith('BATCH-1', [
      { transactionId: 1, accepted: true, rejectionReason: undefined }
    ]);
    // Heavy+double haptic for SETTLED
    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 200, 100, 100, 50, 100]);
  });

  it('handles mixed settlement results correctly', async () => {
    (getPendingTransactions as jest.Mock).mockResolvedValue([
      { id: 1, amount: 100 },
      { id: 2, amount: 200 }
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        batch_id: 'BATCH-2',
        results: [
          { index: 0, accepted: true },
          { index: 1, accepted: false, rejected_reason: 'EXCEEDS_CUMULATIVE_EXPOSURE_CAP' }
        ],
        summary: { total: 2, accepted: 1, rejected: 1 }
      })
    });

    await submitPendingForSettlement();

    expect(applySettlementResults).toHaveBeenCalledWith('BATCH-2', [
      { transactionId: 1, accepted: true, rejectionReason: undefined },
      { transactionId: 2, accepted: false, rejectionReason: 'EXCEEDS_CUMULATIVE_EXPOSURE_CAP' }
    ]);
  });
});
