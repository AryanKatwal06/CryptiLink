/**
 * CryptiLink — Compact Payload Serializer/Deserializer
 *
 * ══════════════════════════════════════════════════════════════════════
 * 84-BYTE BINARY FORMAT
 * ══════════════════════════════════════════════════════════════════════
 *
 * This module handles serialization and deserialization of the compact
 * per-transaction payload that will be transported via SMS in Phase 3.
 *
 * See src/types/compactPayload.ts for the full format specification.
 *
 * SIGNATURE FORMAT CONVERSION:
 * Node.js crypto produces ECDSA signatures in DER encoding by default.
 * The compact payload requires raw (r‖s) format — exactly 64 bytes
 * (32 bytes for r, 32 bytes for s). This module handles the conversion
 * between DER and raw formats.
 */

import crypto from 'crypto';
import {
  CompactPayload,
  CompactPayloadData,
  COMPACT_PAYLOAD_SIZE,
  COMPACT_PAYLOAD_DATA_SIZE,
  COMPACT_SIGNATURE_SIZE,
  WALLET_ID_HASH_SIZE,
} from '../types/compactPayload';

/**
 * Computes a truncated SHA-256 hash of a wallet ID.
 *
 * Returns the first 8 bytes (64 bits) of SHA-256(wallet_id).
 *
 * COLLISION RISK: At 8 bytes, the birthday-bound collision probability
 * reaches 50% at ~2^32 ≈ 4.3 billion wallets. This is an ACCEPTED
 * PROTOTYPE LIMITATION — CryptiLink's target scale is well below this.
 * Production would use a larger hash or a full wallet_id.
 *
 * @param walletId - The full wallet ID (e.g., "CL-VAULT-<uuid>")
 * @returns Hex-encoded 8-byte hash
 */
export function hashWalletId(walletId: string): string {
  const fullHash = crypto.createHash('sha256').update(walletId).digest();
  return fullHash.subarray(0, WALLET_ID_HASH_SIZE).toString('hex');
}

/**
 * Serializes the unsigned data portion of a compact payload (20 bytes).
 * This is the data that gets signed by the consumer's private key.
 */
export function serializePayloadData(data: CompactPayloadData): Buffer {
  const buf = Buffer.alloc(COMPACT_PAYLOAD_DATA_SIZE);
  let offset = 0;

  // wallet_id_hash: 8 bytes
  const hashBytes = Buffer.from(data.walletIdHash, 'hex');
  if (hashBytes.length !== WALLET_ID_HASH_SIZE) {
    throw new Error(`wallet_id_hash must be ${WALLET_ID_HASH_SIZE} bytes, got ${hashBytes.length}`);
  }
  hashBytes.copy(buf, offset);
  offset += WALLET_ID_HASH_SIZE;

  // amount: 4 bytes int32 BE (stored as paise = amount × 100)
  const paise = Math.round(data.amount * 100);
  buf.writeInt32BE(paise, offset);
  offset += 4;

  // sequence_counter: 4 bytes int32 BE
  buf.writeInt32BE(data.sequenceCounter, offset);
  offset += 4;

  // timestamp: 4 bytes int32 BE (unix epoch seconds)
  // WARNING: int32 overflows on 2038-01-19T03:14:07Z — accepted prototype limitation
  buf.writeInt32BE(data.timestamp, offset);

  return buf;
}

/**
 * Converts a DER-encoded ECDSA signature to raw (r‖s) format.
 *
 * DER format: 30 <len> 02 <rlen> <r> 02 <slen> <s>
 * Raw format: <r_padded_32bytes> <s_padded_32bytes>
 *
 * The r and s values may be shorter than 32 bytes (due to leading zeros
 * being stripped in DER) or longer (due to a leading 0x00 padding byte
 * when the high bit is set). This function handles both cases.
 */
export function derToRawSignature(derSignature: Buffer): Buffer {
  // Parse the DER structure
  if (derSignature[0] !== 0x30) {
    throw new Error('Invalid DER signature: missing SEQUENCE tag');
  }

  let offset = 2; // Skip SEQUENCE tag and length

  // Parse r
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature: missing INTEGER tag for r');
  }
  offset++;
  const rLen = derSignature[offset];
  offset++;
  let r = derSignature.subarray(offset, offset + rLen);
  offset += rLen;

  // Parse s
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature: missing INTEGER tag for s');
  }
  offset++;
  const sLen = derSignature[offset];
  offset++;
  let s = derSignature.subarray(offset, offset + sLen);

  // Strip leading zero padding (DER adds 0x00 when high bit is set)
  if (r.length > 32 && r[0] === 0x00) {
    r = r.subarray(r.length - 32);
  }
  if (s.length > 32 && s[0] === 0x00) {
    s = s.subarray(s.length - 32);
  }

  // Pad to exactly 32 bytes each (left-pad with zeros if shorter)
  const raw = Buffer.alloc(COMPACT_SIGNATURE_SIZE);
  r.copy(raw, 32 - r.length);
  s.copy(raw, 64 - s.length);

  return raw;
}

/**
 * Converts a raw (r‖s) signature back to DER encoding.
 *
 * This is needed because Node.js's crypto.createVerify() expects
 * DER-encoded signatures by default.
 */
export function rawToDerSignature(rawSignature: Buffer): Buffer {
  if (rawSignature.length !== COMPACT_SIGNATURE_SIZE) {
    throw new Error(`Raw signature must be ${COMPACT_SIGNATURE_SIZE} bytes, got ${rawSignature.length}`);
  }

  let r = rawSignature.subarray(0, 32);
  let s = rawSignature.subarray(32, 64);

  // Strip leading zeros (but keep at least 1 byte)
  while (r.length > 1 && r[0] === 0x00 && !(r[1] & 0x80)) {
    r = r.subarray(1);
  }
  while (s.length > 1 && s[0] === 0x00 && !(s[1] & 0x80)) {
    s = s.subarray(1);
  }

  // Add leading 0x00 if high bit is set (DER integer sign convention)
  if (r[0] & 0x80) {
    r = Buffer.concat([Buffer.from([0x00]), r]);
  }
  if (s[0] & 0x80) {
    s = Buffer.concat([Buffer.from([0x00]), s]);
  }

  // Build DER: 30 <len> 02 <rlen> <r> 02 <slen> <s>
  const rComponent = Buffer.concat([Buffer.from([0x02, r.length]), r]);
  const sComponent = Buffer.concat([Buffer.from([0x02, s.length]), s]);
  const payload = Buffer.concat([rComponent, sComponent]);

  return Buffer.concat([Buffer.from([0x30, payload.length]), payload]);
}

/**
 * Serializes a complete compact payload into an 84-byte buffer.
 *
 * @param payload - The deserialized payload with all fields
 * @returns 84-byte buffer ready for transport
 */
export function serializeCompactPayload(payload: CompactPayload): Buffer {
  const buf = Buffer.alloc(COMPACT_PAYLOAD_SIZE);

  // Serialize the data portion (first 20 bytes)
  const dataBuf = serializePayloadData({
    walletIdHash: payload.walletIdHash,
    amount: payload.amount,
    sequenceCounter: payload.sequenceCounter,
    timestamp: payload.timestamp,
  });
  dataBuf.copy(buf, 0);

  // Signature: 64 bytes raw (r‖s), base64-decoded
  const sigBytes = Buffer.from(payload.signature, 'base64');
  if (sigBytes.length !== COMPACT_SIGNATURE_SIZE) {
    throw new Error(`Signature must be ${COMPACT_SIGNATURE_SIZE} bytes, got ${sigBytes.length}`);
  }
  sigBytes.copy(buf, COMPACT_PAYLOAD_DATA_SIZE);

  return buf;
}

/**
 * Deserializes an 84-byte buffer into a CompactPayload object.
 *
 * @param buf - The 84-byte binary payload
 * @returns Deserialized payload object
 */
export function deserializeCompactPayload(buf: Buffer): CompactPayload {
  if (buf.length !== COMPACT_PAYLOAD_SIZE) {
    throw new Error(`Buffer must be ${COMPACT_PAYLOAD_SIZE} bytes, got ${buf.length}`);
  }

  let offset = 0;

  // wallet_id_hash: 8 bytes → hex
  const walletIdHash = buf.subarray(offset, offset + WALLET_ID_HASH_SIZE).toString('hex');
  offset += WALLET_ID_HASH_SIZE;

  // amount: 4 bytes int32 BE (paise) → convert back to rupees
  const paise = buf.readInt32BE(offset);
  const amount = paise / 100;
  offset += 4;

  // sequence_counter: 4 bytes int32 BE
  const sequenceCounter = buf.readInt32BE(offset);
  offset += 4;

  // timestamp: 4 bytes int32 BE
  const timestamp = buf.readInt32BE(offset);
  offset += 4;

  // signature: 64 bytes raw (r‖s) → base64
  const sigBytes = buf.subarray(offset, offset + COMPACT_SIGNATURE_SIZE);
  const signature = sigBytes.toString('base64');

  return {
    walletIdHash,
    amount,
    sequenceCounter,
    timestamp,
    signature,
  };
}

/**
 * Signs the data portion of a compact payload with a consumer's private key.
 *
 * @param data - The 20-byte data to sign
 * @param privateKey - Consumer's ECDSA private key
 * @returns Raw (r‖s) signature as base64
 */
export function signCompactPayloadData(
  data: CompactPayloadData,
  privateKey: crypto.KeyObject
): string {
  const dataBuf = serializePayloadData(data);

  const signer = crypto.createSign('SHA256');
  signer.update(dataBuf);
  signer.end();

  // Node.js produces DER by default — convert to raw (r‖s)
  const derSig = signer.sign(privateKey);
  const rawSig = derToRawSignature(derSig);

  return rawSig.toString('base64');
}

/**
 * Verifies the consumer's ECDSA signature on a compact payload.
 *
 * @param payload - The deserialized compact payload
 * @param publicKeyBase64 - Consumer's public key as base64-encoded SPKI DER
 * @returns true if the signature is valid
 */
export function verifyCompactPayloadSignature(
  payload: CompactPayload,
  publicKeyBase64: string
): boolean {
  try {
    // Reconstruct the signed data
    const dataBuf = serializePayloadData({
      walletIdHash: payload.walletIdHash,
      amount: payload.amount,
      sequenceCounter: payload.sequenceCounter,
      timestamp: payload.timestamp,
    });

    // Convert raw signature back to DER for Node.js verification
    const rawSig = Buffer.from(payload.signature, 'base64');
    const derSig = rawToDerSignature(rawSig);

    // Load the consumer's public key
    const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');
    const publicKey = crypto.createPublicKey({
      key: publicKeyDer,
      type: 'spki',
      format: 'der',
    });

    const verifier = crypto.createVerify('SHA256');
    verifier.update(dataBuf);
    verifier.end();

    return verifier.verify(publicKey, derSig);
  } catch {
    return false;
  }
}
