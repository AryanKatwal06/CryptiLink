import { PostHog } from 'posthog-node';
import config from '../config';

let client: PostHog | null = null;

if (config.posthogApiKey) {
  client = new PostHog(config.posthogApiKey, {
    host: 'https://app.posthog.com',
  });
}

// Ensure non-blocking fire-and-forget calls
const safeTrack = (event: string, properties: Record<string, any>) => {
  try {
    if (client) {
      client.capture({
        distinctId: 'server-node', 
        event,
        properties,
      });
    }
  } catch (error) {
    // Silently swallow analytics errors
  }
};

export const trackWalletRegistered = (walletIdHash: string) => {
  safeTrack('WALLET_REGISTERED', { wallet_id_hash: walletIdHash });
};

export const trackCertIssued = (walletIdHash: string, amountEscrowed: number, expiryTimestamp: number) => {
  safeTrack('CERT_ISSUED', {
    wallet_id_hash: walletIdHash,
    amount_escrowed: amountEscrowed,
    expiry_timestamp: expiryTimestamp,
  });
};

export const trackSettlementBatchReceived = (merchantId: string, batchSize: number, totalAmountInBatch: number) => {
  safeTrack('SETTLEMENT_BATCH_RECEIVED', {
    merchant_id: merchantId,
    batch_size: batchSize,
    total_amount_in_batch: totalAmountInBatch,
  });
};

export const trackTxSettled = (walletIdHash: string, amount: number, channelHint: string | undefined, settlementLatencyMs: number) => {
  safeTrack('TX_SETTLED', {
    wallet_id_hash: walletIdHash,
    amount,
    channel_hint: channelHint || 'unknown',
    settlement_latency_ms: settlementLatencyMs,
  });
};

export type RejectionReason =
  | 'EXCEEDS_PER_TX_CAP'
  | 'EXCEEDS_CUMULATIVE_EXPOSURE_CAP'
  | 'REPLAY_ATTACK_DETECTED'
  | 'EXPIRED_CERTIFICATE'
  | 'INVALID_SIGNATURE';

export const trackTxRejected = (walletIdHash: string, amount: number, rejectionReason: RejectionReason) => {
  safeTrack('TX_REJECTED', {
    wallet_id_hash: walletIdHash,
    amount,
    rejection_reason: rejectionReason,
  });
};
