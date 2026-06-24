/**
 * PHASE 6 INTEGRATION TEST — Node.js simulation
 *
 * This test verifies that the compact payload serialization
 * format and DER→raw64 signature conversion are correct
 * by simulating the Kotlin signing logic using Node.js crypto.
 *
 * LIMITATION: This does NOT test the actual Android Keystore
 * or StrongBox hardware signing. The real end-to-end test
 * (Kotlin Keystore → merchant ecdsaVerify.ts) requires a
 * physical Android device and must be performed manually
 * before any production or demo use.
 *
 * Manual device test checklist:
 * 1. Install the app on a real Android device (API 28+)
 * 2. Complete onboarding — note whether STRONGBOX or TEE
 *    is reported in the security level indicator
 * 3. Load funds and verify the certificate is accepted
 * 4. Scan a test UPI QR and complete a signing flow
 * 5. Submit the signed payload to the bank server's
 *    /settle endpoint and confirm PASS in the response
 * 6. Check the merchant app receives and verifies the
 *    same payload correctly
 */
const crypto = require('crypto');
const { 
  serializePayloadData, 
  deserializeCompactPayload, derToRawSignature, 
  verifyCompactPayloadSignature 
} = require('../../cryptilink-bank-server/dist/crypto/compactPayload.js');

async function runTest() {
  console.log('--- Deliverable 5: Integration test ---');
  
  // a. Generates a key pair via CryptiLinkKeyEngine
  // (Simulated for Node.js test environment since native Keystore is unavailable)
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  
  // b. Exports the public key as base64 SPKI DER
  const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' });
  const pubKeyBase64 = pubKeyDer.toString('base64');
  console.log('Public Key (Base64):', pubKeyBase64.substring(0, 32) + '...');
  
  // c. Constructs a test transaction:
  const walletId = "CL-VAULT-TEST-001";
  const amountRupees = 150.00;
  const sequenceCounter = 1;
  const timestampUnix = Math.floor(Date.now() / 1000);
  
  // d. Calls buildAndSignPayload() with these values
  // (Simulated serialization + signature exactly matching TokenSigner.kt)
  const walletIdHashHex = crypto.createHash('sha256').update(walletId).digest('hex').substring(0, 16);
  const paise = Math.round(amountRupees * 100);
  
  const payloadData = Buffer.alloc(20);
  Buffer.from(walletIdHashHex, 'hex').copy(payloadData, 0);
  payloadData.writeInt32BE(paise, 8);
  payloadData.writeInt32BE(sequenceCounter, 12);
  payloadData.writeInt32BE(timestampUnix, 16);
  
  const signer = crypto.createSign('SHA256');
  signer.update(payloadData);
  signer.end();
  const derSignature = signer.sign(privateKey);
  
  // derToRaw64 equivalent using bank server's robust function
  const rawSignature = derToRawSignature(derSignature);
  
  const payload84 = Buffer.concat([payloadData, rawSignature]);
  
  // e. Deserializes the resulting 84 bytes using the bank server's deserializeCompactPayload()
  const deserialized = deserializeCompactPayload(payload84);
  console.log('Deserialized Payload Amount (Paise):', deserialized.amount * 100);
  
  // f. Verifies the signature using verifyCompactPayloadSignature()
  const isValid = verifyCompactPayloadSignature(deserialized, pubKeyBase64);
  
  // g. Asserts the verification returns true
  if (isValid) {
    console.log('Verification: PASS');
  } else {
    console.error('Verification: FAIL');
    process.exit(1);
  }
}

runTest();