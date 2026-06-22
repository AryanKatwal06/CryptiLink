/**
 * CryptiLink Phase 4 — Unified Transaction Receiver
 *
 * Subscribes to native events from both SMS and Acoustic channels
 * and routes them through a single handler. Both channels produce
 * the same deserialized compact payload — the receiver unifies them
 * into one internal pipeline that triggers verification (Deliverable 4).
 *
 * Architecture:
 *   [SMS BroadcastReceiver] ─┐
 *                             ├──→ onTransactionReceived ──→ handleIncomingPayload()
 *   [Acoustic Goertzel FSK] ─┘
 *
 * The channel identifier ('SMS' | 'ACOUSTIC') is preserved through
 * the entire pipeline for UI display (Deliverable 6) — it carries
 * different trust/latency connotations worth surfacing to the merchant.
 */

import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';
import type { TransportChannel } from '../db/MerchantDatabase';

const { CryptiLinkSmsReceiver, CryptiLinkAcousticReceiver } = NativeModules;

/** Deserialized compact payload arriving from either channel */
export interface IncomingPayload {
  /** First 8 bytes of SHA-256(wallet_id), hex-encoded */
  walletIdHash: string;
  /** Transaction amount in ₹ */
  amount: number;
  /** Monotonically increasing counter per wallet */
  sequenceCounter: number;
  /** Unix timestamp (seconds) */
  timestamp: number;
  /** ECDSA raw (r‖s) signature, base64-encoded */
  signature: string;
  /** Which transport channel delivered this payload */
  channel: TransportChannel;
  /** When the payload was received (unix seconds) */
  receivedAt: number;
  /** SMS sender address (if SMS channel) */
  senderAddress?: string;
}

/** Acoustic receiver status update */
export interface AcousticStatus {
  status: 'preamble_detected' | 'receiving_payload' | 'signal_lost';
  channel: 'ACOUSTIC';
}

/** Error from either channel */
export interface TransportError {
  error: string;
  channel: TransportChannel;
}

/** Callback type for incoming payloads */
export type PayloadHandler = (payload: IncomingPayload) => void;
export type StatusHandler = (status: AcousticStatus) => void;
export type ErrorHandler = (error: TransportError) => void;

// ═══════════════════════════════════════════════════════════════
// EVENT SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════

let smsEmitter: NativeEventEmitter | null = null;
let acousticEmitter: NativeEventEmitter | null = null;
const subscriptions: EmitterSubscription[] = [];

let payloadHandlers: PayloadHandler[] = [];
let statusHandlers: StatusHandler[] = [];
let errorHandlers: ErrorHandler[] = [];

/**
 * Initializes the event emitters for both channels.
 * Must be called once during app startup.
 */
export function initializeReceivers(): void {
  if (CryptiLinkSmsReceiver) {
    smsEmitter = new NativeEventEmitter(CryptiLinkSmsReceiver);
  }
  if (CryptiLinkAcousticReceiver) {
    acousticEmitter = new NativeEventEmitter(CryptiLinkAcousticReceiver);
  }
}

/**
 * Starts listening on both transport channels.
 * SMS listens passively (BroadcastReceiver always active).
 * Acoustic requires explicit activation (uses microphone).
 *
 * @param activateAcoustic - Whether to also start acoustic listening
 */
export async function startListening(activateAcoustic = false): Promise<void> {
  // Subscribe to native events if not already subscribed
  if (subscriptions.length === 0) {
    if (smsEmitter) {
      subscriptions.push(
        smsEmitter.addListener('onTransactionReceived', handleNativeEvent),
        smsEmitter.addListener('onTransactionError', handleErrorEvent),
      );
    }
    if (acousticEmitter) {
      subscriptions.push(
        acousticEmitter.addListener('onTransactionReceived', handleNativeEvent),
        acousticEmitter.addListener('onAcousticStatus', handleStatusEvent),
        acousticEmitter.addListener('onTransactionError', handleErrorEvent),
      );
    }
  }

  // Start SMS listener (passive — no microphone)
  if (CryptiLinkSmsReceiver) {
    await CryptiLinkSmsReceiver.startListening();
  }

  // Optionally start acoustic listener (active — uses microphone)
  if (activateAcoustic && CryptiLinkAcousticReceiver) {
    await CryptiLinkAcousticReceiver.startListening();
  }
}

/**
 * Stops listening on all channels.
 */
export async function stopListening(): Promise<void> {
  if (CryptiLinkSmsReceiver) {
    await CryptiLinkSmsReceiver.stopListening();
  }
  if (CryptiLinkAcousticReceiver) {
    await CryptiLinkAcousticReceiver.stopListening();
  }

  // Unsubscribe from events
  subscriptions.forEach((sub) => sub.remove());
  subscriptions.length = 0;
}

/**
 * Activates only the acoustic channel for active listening.
 */
export async function startAcousticListening(): Promise<void> {
  if (CryptiLinkAcousticReceiver) {
    await CryptiLinkAcousticReceiver.startListening();
  }
}

/**
 * Deactivates the acoustic channel (microphone).
 */
export async function stopAcousticListening(): Promise<void> {
  if (CryptiLinkAcousticReceiver) {
    await CryptiLinkAcousticReceiver.stopListening();
  }
}

/**
 * Checks if the acoustic receiver is currently active.
 */
export async function isAcousticActive(): Promise<boolean> {
  if (!CryptiLinkAcousticReceiver) return false;
  return CryptiLinkAcousticReceiver.isActive();
}

// ═══════════════════════════════════════════════════════════════
// HANDLER REGISTRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Registers a handler for incoming transaction payloads.
 * Both SMS and Acoustic payloads converge here.
 *
 * @param handler - Called with the deserialized payload + channel
 * @returns Unsubscribe function
 */
export function onPayloadReceived(handler: PayloadHandler): () => void {
  payloadHandlers.push(handler);
  return () => {
    payloadHandlers = payloadHandlers.filter((h) => h !== handler);
  };
}

/**
 * Registers a handler for acoustic status updates
 * (preamble detection, receiving, signal loss).
 */
export function onAcousticStatus(handler: StatusHandler): () => void {
  statusHandlers.push(handler);
  return () => {
    statusHandlers = statusHandlers.filter((h) => h !== handler);
  };
}

/**
 * Registers a handler for transport errors from either channel.
 */
export function onTransportError(handler: ErrorHandler): () => void {
  errorHandlers.push(handler);
  return () => {
    errorHandlers = errorHandlers.filter((h) => h !== handler);
  };
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Handles a native onTransactionReceived event from either channel.
 * This is the convergence point — both channels produce the same payload.
 */
function handleNativeEvent(event: Record<string, unknown>): void {
  const payload: IncomingPayload = {
    walletIdHash: event.walletIdHash as string,
    amount: event.amount as number,
    sequenceCounter: event.sequenceCounter as number,
    timestamp: event.timestamp as number,
    signature: event.signature as string,
    channel: event.channel as TransportChannel,
    receivedAt: event.receivedAt as number || Math.floor(Date.now() / 1000),
    senderAddress: event.senderAddress as string | undefined,
  };

  // Notify all registered handlers
  payloadHandlers.forEach((handler) => {
    try {
      handler(payload);
    } catch (err) {
      console.error('[TransactionReceiver] Handler error:', err);
    }
  });
}

function handleStatusEvent(event: Record<string, unknown>): void {
  const status: AcousticStatus = {
    status: event.status as AcousticStatus['status'],
    channel: 'ACOUSTIC',
  };

  statusHandlers.forEach((handler) => {
    try {
      handler(status);
    } catch (err) {
      console.error('[TransactionReceiver] Status handler error:', err);
    }
  });
}

function handleErrorEvent(event: Record<string, unknown>): void {
  const error: TransportError = {
    error: event.error as string,
    channel: event.channel as TransportChannel,
  };

  errorHandlers.forEach((handler) => {
    try {
      handler(error);
    } catch (err) {
      console.error('[TransactionReceiver] Error handler error:', err);
    }
  });
}
