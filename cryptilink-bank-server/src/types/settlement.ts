/**
 * CryptiLink — Settlement Type Definitions
 */

/** A single transaction within a settlement batch */
export interface SettlementTransaction {
  /** Full wallet ID (CL-VAULT-<uuid>) — Phase 1 uses full ID, Phase 3+ uses hash lookup */
  wallet_id: string;
  /** Transaction amount in rupees */
  amount: number;
  /** Monotonically increasing counter for replay detection */
  sequence_counter: number;
  /** Unix timestamp (seconds) */
  timestamp: number;
  /** Consumer's ECDSA signature over the transaction data, base64 */
  signature: string;
}

/** A settlement batch submitted by a merchant */
export interface SettlementBatch {
  /** Merchant identifier */
  merchant_id: string;
  /** Ordered list of transactions to settle */
  transactions: SettlementTransaction[];
}

/** Possible rejection reasons — each maps to a specific validation failure */
export type RejectionReason =
  | 'CERTIFICATE_NOT_FOUND'
  | 'CERTIFICATE_EXPIRED'
  | 'CERTIFICATE_REVOKED'
  | 'INVALID_SIGNATURE'
  | 'REPLAY_ATTACK_DETECTED'
  | 'EXCEEDS_PER_TX_CAP'
  | 'EXCEEDS_CUMULATIVE_EXPOSURE_CAP'
  | 'WALLET_NOT_FOUND'
  | 'WALLET_SUSPENDED';

/** Result for a single transaction within a batch */
export interface TransactionResult {
  /** Index within the batch (0-based) */
  index: number;
  /** Wallet ID this transaction belongs to */
  wallet_id: string;
  /** Whether the transaction was accepted and settled */
  accepted: boolean;
  /** If rejected, the specific reason */
  rejected_reason?: RejectionReason;
  /** The amount that was settled (0 if rejected) */
  settled_amount: number;
}

/** Response from the settlement endpoint */
export interface SettlementResponse {
  /** Batch ID assigned by the server */
  batch_id: string;
  /** Merchant who submitted the batch */
  merchant_id: string;
  /** Per-transaction results in submission order */
  results: TransactionResult[];
  /** Summary counts */
  summary: {
    total: number;
    accepted: number;
    rejected: number;
    total_settled_amount: number;
  };
}
