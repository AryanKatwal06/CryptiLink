/**
 * CryptiLink — Compact Per-Transaction Payload Type Definitions
 *
 * ══════════════════════════════════════════════════════════════════════
 * BINARY FORMAT SPECIFICATION (84 bytes total)
 * ══════════════════════════════════════════════════════════════════════
 *
 * This is the lightweight payload format that Phase 3's SMS transport will
 * carry. It is designed to fit within the constraints of a single SMS or
 * an acoustic modem burst.
 *
 * ┌──────────────────────┬────────┬──────────────────────────────────┐
 * │ Field                │ Bytes  │ Encoding                         │
 * ├──────────────────────┼────────┼──────────────────────────────────┤
 * │ wallet_id_hash       │ 8      │ First 8 bytes of SHA-256(wallet_id)│
 * │ amount               │ 4      │ int32 BE, amount × 100 (paise)   │
 * │ sequence_counter     │ 4      │ int32 BE, monotonic              │
 * │ timestamp            │ 4      │ int32 BE, unix epoch seconds     │
 * │ signature            │ 64     │ ECDSA raw (r‖s), 32+32 bytes     │
 * ├──────────────────────┼────────┼──────────────────────────────────┤
 * │ TOTAL                │ 84     │                                  │
 * └──────────────────────┴────────┴──────────────────────────────────┘
 *
 * IMPORTANT NOTES:
 *
 * 1. The `signature` is computed over the first 20 bytes (hash + amount +
 *    sequence_counter + timestamp), NOT over the full 84 bytes.
 *
 * 2. `wallet_id_hash` is a TRUNCATED hash — at 8 bytes (64 bits), the
 *    birthday-bound collision probability reaches 50% at ~2^32 ≈ 4 billion
 *    wallets. This is an ACCEPTED PROTOTYPE LIMITATION for CryptiLink's
 *    target scale. Production would use a larger hash or full wallet_id.
 *
 * 3. `timestamp` uses int32, which overflows on 2038-01-19T03:14:07Z.
 *    This is a KNOWN PROTOTYPE LIMITATION documented here intentionally.
 *    Production would use int64 or a different epoch.
 *
 * 4. `signature` uses raw (r‖s) format, NOT DER, to fit the fixed 64-byte
 *    slot. The serializer/deserializer must convert between Node.js's
 *    default DER format and raw format.
 */

/** Deserialized compact payload (before/after binary encoding) */
export interface CompactPayload {
  /** First 8 bytes of SHA-256(wallet_id), hex-encoded for convenience */
  walletIdHash: string;
  /** Transaction amount in rupees (will be stored as paise internally) */
  amount: number;
  /** Monotonically increasing counter per wallet */
  sequenceCounter: number;
  /**
   * Unix timestamp in seconds.
   * WARNING: int32 — overflows 2038-01-19T03:14:07Z. Accepted prototype limitation.
   */
  timestamp: number;
  /** ECDSA signature in raw (r‖s) format, base64-encoded */
  signature: string;
}

/** The unsigned data portion of a compact payload (first 20 bytes) */
export interface CompactPayloadData {
  walletIdHash: string;
  amount: number;
  sequenceCounter: number;
  timestamp: number;
}

/** Total payload size in bytes */
export const COMPACT_PAYLOAD_SIZE = 84;

/** Size of the signed data portion (everything except the signature) */
export const COMPACT_PAYLOAD_DATA_SIZE = 20;

/** Size of the ECDSA raw signature (r: 32 bytes + s: 32 bytes) */
export const COMPACT_SIGNATURE_SIZE = 64;

/** Size of the truncated wallet ID hash */
export const WALLET_ID_HASH_SIZE = 8;
