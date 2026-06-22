/**
 * CryptiLink Phase 4 — Transaction Ledger Unit Tests
 */

import {
  recordVerifiedTransaction,
  recordRejectedTransaction,
  updateTransactionStatus,
  applySettlementResults,
  getTransactionsByStatus,
} from '../db/TransactionLedger';
import { getDatabase } from '../db/MerchantDatabase';

jest.mock('../db/MerchantDatabase', () => {
  const mockDb = {
    executeSql: jest.fn(),
  };
  return {
    getDatabase: jest.fn(() => mockDb),
  };
});

describe('TransactionLedger', () => {
  let db: any;

  beforeEach(() => {
    jest.clearAllMocks();
    db = getDatabase();
  });

  it('records a verified transaction with OFFLINE_VERIFIED status', async () => {
    db.executeSql.mockResolvedValue([{ insertId: 1 }]);

    const id = await recordVerifiedTransaction({
      walletIdHash: 'hash',
      walletId: 'wallet',
      amount: 100,
      sequenceCounter: 1,
      signature: 'sig',
      channel: 'SMS',
      timestamp: 1234567890,
      receivedAt: 1234567891,
      verificationChecks: '[]',
    });

    expect(id).toBe(1);
    expect(db.executeSql).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO merchant_transactions'),
      expect.arrayContaining(['OFFLINE_VERIFIED'])
    );
  });

  it('updates transaction status strictly from OFFLINE_VERIFIED', async () => {
    db.executeSql.mockResolvedValue([{ rowsAffected: 1 }]);

    await updateTransactionStatus(1, 'SETTLED', 'batch1');

    expect(db.executeSql).toHaveBeenCalledWith(
      expect.stringContaining("AND status = 'OFFLINE_VERIFIED'"),
      ['SETTLED', 'batch1', null, 1]
    );
  });

  it('applies batch settlement results correctly', async () => {
    db.executeSql.mockResolvedValue([{ rowsAffected: 1 }]);

    const result = await applySettlementResults('batch1', [
      { transactionId: 1, accepted: true },
      { transactionId: 2, accepted: false, rejectionReason: 'REPLAY_ATTACK_DETECTED' },
    ]);

    expect(result).toEqual({ settled: 1, rejected: 1, skipped: 0 });
    expect(db.executeSql).toHaveBeenCalledTimes(2);
  });
});
