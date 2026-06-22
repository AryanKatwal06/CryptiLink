import PostHog from 'posthog-react-native';
import Config from 'react-native-config';
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const posthog = new PostHog(Config.POSTHOG_API_KEY || 'dummy_key', {
  host: 'https://app.posthog.com',
});

// Manage distinct ID in MMKV
const DISTINCT_ID_KEY = 'analytics_distinct_id';
let distinctId = storage.getString(DISTINCT_ID_KEY);

if (!distinctId) {
  distinctId = uuidv4();
  storage.set(DISTINCT_ID_KEY, distinctId);
}
posthog.identify(distinctId);

// Ensure non-blocking fire-and-forget calls
const safeTrack = (event: string, properties: Record<string, any>) => {
  try {
    posthog.capture(event, properties);
  } catch (error) {
    // Silently swallow analytics errors
  }
};

export const trackVaultLoaded = (walletIdHash: string, amountLoaded: number, certExpiryHoursRemaining: number) => {
  safeTrack('VAULT_LOADED', {
    wallet_id_hash: walletIdHash,
    amount_loaded: amountLoaded,
    cert_expiry_hours_remaining: certExpiryHoursRemaining,
  });
};

export const trackQrScanned = (merchantVpaDomain: string, decodedAmount: number) => {
  safeTrack('QR_SCANNED', {
    merchant_vpa_domain: merchantVpaDomain,
    decoded_amount: decodedAmount,
  });
};

export const trackTxSigned = (amount: number, sequenceCounter: number, connectivityState: string) => {
  safeTrack('TX_SIGNED', {
    amount,
    sequence_counter: sequenceCounter,
    connectivity_state: connectivityState,
  });
};

export const trackTxTransmitted = (channelUsed: string, amount: number, transmissionDurationMs: number) => {
  safeTrack('TX_TRANSMITTED', {
    channel_used: channelUsed,
    amount,
    transmission_duration_ms: transmissionDurationMs,
  });
};

export const trackOfflineCapBlocked = (attemptedAmount: number, cumulativeExposureAtBlock: number, capType: 'per_tx' | 'cumulative') => {
  safeTrack('OFFLINE_CAP_BLOCKED', {
    attempted_amount: attemptedAmount,
    cumulative_exposure_at_block: cumulativeExposureAtBlock,
    cap_type: capType,
  });
};

export const trackConnectivityStateChanged = (newState: string, previousState: string, sessionDurationMs: number) => {
  safeTrack('CONNECTIVITY_STATE_CHANGED', {
    new_state: newState,
    previous_state: previousState,
    session_duration_in_previous_state_ms: sessionDurationMs,
  });
};
