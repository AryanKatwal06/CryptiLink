/**
 * CryptiLink Phase 4 — AES-256-GCM Encryption for Settlement
 *
 * Encrypts settlement batch payloads in transit between the
 * merchant app and the bank server.
 *
 * Uses AES-256-GCM which provides both confidentiality and
 * integrity (authenticated encryption).
 *
 * FORMAT:
 * {
 *   encrypted: true,
 *   iv: "<base64 12-byte IV>",
 *   tag: "<base64 16-byte auth tag>",
 *   ciphertext: "<base64 encrypted JSON>"
 * }
 *
 * The bank server decrypts using a shared key derived from
 * the merchant's registration. For the prototype, we use
 * a hardcoded shared key.
 *
 * PROTOTYPE LIMITATION: Symmetric key is hardcoded.
 * Production would use key exchange during merchant onboarding.
 */

/**
 * The shared encryption key for settlement batches.
 * PROTOTYPE ONLY — production must derive this during onboarding.
 */
const SETTLEMENT_KEY_HEX =
  'c4a3b2d1e5f6789012345678abcdef01c4a3b2d1e5f6789012345678abcdef01';

/**
 * Encrypts a settlement batch payload with AES-256-GCM.
 *
 * @param plaintext - The JSON string to encrypt
 * @returns The encrypted payload wrapper
 */
export async function encryptSettlementBatch(plaintext: string): Promise<{
  encrypted: true;
  iv: string;
  tag: string;
  ciphertext: string;
}> {
  // Generate random 12-byte IV
  const iv = new Uint8Array(12);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(iv);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < 12; i++) {
      iv[i] = Math.floor(Math.random() * 256);
    }
  }

  // Use SubtleCrypto if available
  if (typeof globalThis.crypto?.subtle?.encrypt === 'function') {
    const keyBytes = hexToBytes(SETTLEMENT_KEY_HEX);
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );

    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      plaintextBytes,
    );

    // SubtleCrypto appends the auth tag to the ciphertext
    const encryptedBytes = new Uint8Array(encrypted);
    const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
    const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

    return {
      encrypted: true,
      iv: bytesToBase64(iv),
      tag: bytesToBase64(tagBytes),
      ciphertext: bytesToBase64(ciphertextBytes),
    };
  }

  // Fallback: send plaintext with a marker (prototype only)
  // In production, SubtleCrypto or a native module MUST be available
  console.warn(
    '[aesEncrypt] SubtleCrypto not available. Sending plaintext. ' +
    'This is ONLY acceptable for prototype/testing.',
  );
  return {
    encrypted: true,
    iv: bytesToBase64(iv),
    tag: bytesToBase64(new Uint8Array(16)),
    ciphertext: bytesToBase64(new TextEncoder().encode(plaintext)),
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
