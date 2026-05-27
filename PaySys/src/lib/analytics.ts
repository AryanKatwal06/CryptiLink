import { PostHog } from 'posthog-react-native';
import Config from 'react-native-config';

let posthogInstance: PostHog | null = null;

export async function initAnalytics(): Promise<PostHog> {
  if (posthogInstance) return posthogInstance;

  posthogInstance = await PostHog.initAsync(Config.POSTHOG_API_KEY ?? '', {
    host: Config.POSTHOG_HOST,
    disabled: Config.APP_ENV === 'test',
    defaultOptIn: true,
    captureApplicationLifecycleEvents: true,
    flushAt: 20,
    flushInterval: 30000,
  });

  return posthogInstance;
}

export function getAnalytics(): PostHog {
  if (!posthogInstance) {
    throw new Error('[PaySys] Analytics not initialized. Call initAnalytics() first.');
  }
  return posthogInstance;
}

export const Events = {
  OTP_SENT: 'otp_sent',
  OTP_VERIFIED: 'otp_verified',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
  WALLET_VIEWED: 'wallet_viewed',
  TRANSFER_INITIATED: 'transfer_initiated',
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_FAILED: 'transfer_failed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  QR_GENERATED: 'qr_generated',
  QR_SCANNED: 'qr_scanned',
  MERCHANT_CREATED: 'merchant_created',
  OFFLINE_QUEUED: 'offline_queue_added',
  OFFLINE_SYNC_SUCCESS: 'offline_sync_success',
  OFFLINE_SYNC_FAILED: 'offline_sync_failed',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
