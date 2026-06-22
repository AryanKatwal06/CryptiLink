/**
 * CryptiLink Phase 4 — Settlement Batch Upload Service
 *
 * Monitors connectivity, batches OFFLINE_VERIFIED transactions,
 * encrypts them with AES-256-GCM, and POSTs to Phase 1's /api/v1/settle.
 *
 * ═══════════════════════════════════════════════════════════════
 * THE SETTLEMENT FLOW — WHERE OFFLINE_VERIFIED BECOMES SETTLED
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. Connectivity returns (NetInfo event)
 * 2. Batch all OFFLINE_VERIFIED transactions from the ledger
 * 3. POST to /api/v1/settle with merchant_id + transactions
 * 4. For each transaction in the response:
 *    - accepted: true  → status = SETTLED  (bank confirmed!)
 *    - accepted: false → status = SETTLEMENT_REJECTED
 *                        (with specific rejection reason)
 * 5. Haptic feedback:
 *    - SETTLED: heavy+double vibration — THIS is the "you got paid"
 *      moment, distinct from the earlier medium (pending) haptic
 *    - SETTLEMENT_REJECTED: 3 sharp pulses + prominent UI update
 *      NEVER silently sit as stale OFFLINE_VERIFIED
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { Vibration } from 'react-native';
import { getPendingTransactions } from '../db/TransactionLedger';
import { applySettlementResults } from '../db/TransactionLedger';
import { getBankUrl, getMerchantId } from './MerchantOnboarding';
import { encryptSettlementBatch } from '../crypto/aesEncrypt';
import type { MerchantTransaction } from '../db/MerchantDatabase';

/** Settlement batch response from the bank (matches Phase 1's SettlementResponse) */
interface SettlementResponse {
  batch_id: string;
  merchant_id: string;
  results: Array<{
    index: number;
    wallet_id: string;
    accepted: boolean;
    rejected_reason?: string;
    settled_amount: number;
  }>;
  summary: {
    total: number;
    accepted: number;
    rejected: number;
    total_settled_amount: number;
  };
}

/** Settlement service state */
interface SettlementState {
  isSubmitting: boolean;
  lastSubmissionTime: number | null;
  lastBatchId: string | null;
  lastResult: SettlementResponse | null;
}

const state: SettlementState = {
  isSubmitting: false,
  lastSubmissionTime: null,
  lastBatchId: null,
  lastResult: null,
};

/** Listeners for settlement events */
type SettlementListener = (event: SettlementEvent) => void;
const listeners: SettlementListener[] = [];

export interface SettlementEvent {
  type: 'batch_submitted' | 'batch_settled' | 'batch_error' | 'transaction_settled' | 'transaction_rejected';
  batchId?: string;
  transactionId?: number;
  amount?: number;
  rejectionReason?: string;
  summary?: SettlementResponse['summary'];
  error?: string;
}

/**
 * Registers a listener for settlement events.
 * Returns an unsubscribe function.
 */
export function onSettlementEvent(listener: SettlementListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

function emitEvent(event: SettlementEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('[SettlementService] Listener error:', err);
    }
  });
}

/**
 * Attempts to submit all pending OFFLINE_VERIFIED transactions
 * to the bank for settlement.
 *
 * Call this when connectivity is detected. Idempotent — if a
 * submission is already in progress, this is a no-op.
 *
 * @returns Summary of the settlement batch result
 */
export async function submitPendingForSettlement(): Promise<SettlementResponse | null> {
  if (state.isSubmitting) {
    console.log('[SettlementService] Submission already in progress, skipping');
    return null;
  }

  state.isSubmitting = true;

  try {
    // Step 1: Gather all OFFLINE_VERIFIED transactions
    const pendingTxs = await getPendingTransactions();

    if (pendingTxs.length === 0) {
      console.log('[SettlementService] No pending transactions to settle');
      state.isSubmitting = false;
      return null;
    }

    // Step 2: Get merchant credentials
    const merchantId = await getMerchantId();
    if (!merchantId) {
      throw new Error('Merchant not onboarded — cannot submit settlement');
    }

    const bankUrl = await getBankUrl();

    // Step 3: Build the settlement batch payload
    // Maps local transaction format to Phase 1's SettlementTransaction format
    const transactions = pendingTxs.map((tx) => ({
      wallet_id: tx.walletId || tx.walletIdHash, // Full ID if available, hash as fallback
      amount: tx.amount,
      sequence_counter: tx.sequenceCounter,
      timestamp: tx.timestamp,
      signature: tx.signature,
    }));

    const batchPayload = JSON.stringify({
      merchant_id: merchantId,
      transactions,
    });

    // Step 4: Encrypt with AES-256-GCM
    const encryptedPayload = await encryptSettlementBatch(batchPayload);

    emitEvent({ type: 'batch_submitted' });

    // Step 5: POST to /api/v1/settle
    const response = await fetch(`${bankUrl}/api/v1/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(encryptedPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Settlement failed: ${response.status} — ${errorData.error || 'Unknown error'}`,
      );
    }

    const result: SettlementResponse = await response.json();
    state.lastBatchId = result.batch_id;
    state.lastResult = result;
    state.lastSubmissionTime = Date.now();

    // Step 6: Update each local transaction based on bank response
    const settlementUpdates = result.results.map((r, index) => ({
      transactionId: pendingTxs[r.index]?.id || pendingTxs[index]?.id,
      accepted: r.accepted,
      rejectionReason: r.rejected_reason,
    }));

    const updateSummary = await applySettlementResults(
      result.batch_id,
      settlementUpdates,
    );

    // Step 7: Haptic feedback per result
    let hasSettled = false;
    let hasRejected = false;

    for (const r of result.results) {
      const localTx = pendingTxs[r.index];
      if (r.accepted) {
        hasSettled = true;
        emitEvent({
          type: 'transaction_settled',
          batchId: result.batch_id,
          transactionId: localTx?.id,
          amount: r.settled_amount,
        });
      } else {
        hasRejected = true;
        emitEvent({
          type: 'transaction_rejected',
          batchId: result.batch_id,
          transactionId: localTx?.id,
          amount: localTx?.amount,
          rejectionReason: r.rejected_reason,
        });
      }
    }

    // ── HAPTIC: Heavy + double for SETTLED ────────────────────────
    // THIS is the actual "you got paid" moment.
    // This MUST feel different from the earlier medium haptic
    // (which only meant "offline-verified, pending settlement").
    if (hasSettled) {
      // Heavy vibration (200ms) + pause (100ms) + double tap (100ms + 50ms + 100ms)
      Vibration.vibrate([0, 200, 100, 100, 50, 100]);
    }

    // ── HAPTIC: Sharp pulses for REJECTED ─────────────────────────
    if (hasRejected && !hasSettled) {
      // 3 sharp pulses for rejection-only batch
      Vibration.vibrate([0, 30, 80, 30, 80, 30]);
    }

    emitEvent({
      type: 'batch_settled',
      batchId: result.batch_id,
      summary: result.summary,
    });

    console.log(
      `[SettlementService] Batch ${result.batch_id} complete: ` +
      `${updateSummary.settled} settled, ${updateSummary.rejected} rejected`,
    );

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SettlementService] Settlement failed:', errorMessage);

    emitEvent({
      type: 'batch_error',
      error: errorMessage,
    });

    return null;
  } finally {
    state.isSubmitting = false;
  }
}

/**
 * Gets the current settlement service state.
 */
export function getSettlementState(): Readonly<SettlementState> {
  return { ...state };
}

/**
 * Checks connectivity and submits pending transactions if online.
 * Uses React Native's NetInfo pattern.
 *
 * This should be called:
 * 1. On app foregrounding
 * 2. On network state change (WiFi/cellular connected)
 * 3. Periodically via a background timer
 */
export async function checkAndSettle(): Promise<void> {
  try {
    // Simple connectivity check via fetch
    const bankUrl = await getBankUrl();
    const healthCheck = await Promise.race([
      fetch(`${bankUrl}/health`, { method: 'GET' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ]);

    if (healthCheck.ok) {
      await submitPendingForSettlement();
    }
  } catch {
    // Offline — no action needed, will retry when connectivity returns
  }
}
