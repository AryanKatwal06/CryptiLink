/**
 * CryptiLink — Bank Key Generation Script
 *
 * CLI tool to generate or rotate the bank's ECDSA keypair.
 * Usage: npx ts-node scripts/generate-bank-keys.ts
 *
 * This will:
 * 1. Generate a new prime256v1 (secp256r1 / P-256) ECDSA keypair
 * 2. Write the PEM files to the configured paths
 * 3. Print the public key fingerprint for verification
 *
 * WARNING: Rotating keys invalidates ALL existing certificates.
 * In production, this would need a key migration strategy.
 */

import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

// Load env from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { generateBankKeyPair, writeKeysToDisk } from '../src/crypto/bankKeys';
import { config } from '../src/config';

function main(): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CryptiLink — Bank Key Generation');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  console.log(`  Curve:        prime256v1 (secp256r1 / P-256)`);
  console.log(`  Private key:  ${config.bankPrivateKeyPath}`);
  console.log(`  Public key:   ${config.bankPublicKeyPath}`);
  console.log('');

  const { privateKeyPem, publicKeyPem } = generateBankKeyPair();
  writeKeysToDisk(privateKeyPem, publicKeyPem);

  // Compute a fingerprint for easy verification
  const fingerprint = crypto.createHash('sha256')
    .update(publicKeyPem)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase()
    .match(/.{4}/g)!
    .join(':');

  console.log(`  ✓ Keypair generated successfully`);
  console.log(`  📍 Public key fingerprint: ${fingerprint}`);
  console.log('');
  console.log('  ⚠ WARNING: Rotating keys invalidates ALL existing certificates.');
  console.log('');
}

main();
