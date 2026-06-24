package com.cryptilink.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.security.Security
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.io.File
import java.util.Base64

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class TokenSignerTest {

    @Before
    fun setup() {
        Security.addProvider(BouncyCastleProvider())
        // In Robolectric, AndroidKeyStore doesn't fully support ECKeyGenParameterSpec with all hardware flags.
        // We will just let Robolectric's ShadowKeyStore handle it, or we use BouncyCastle KeyStore.
        CryptiLinkKeyEngine.KEYSTORE_PROVIDER = "BouncyCastle"
    }

    @Test
    fun testDerToRaw64() {
        // Known DER vector for ECDSA SHA256 (32 byte r and s)
        val der = byteArrayOf(
            0x30, 0x44, 0x02, 0x20, 
            0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 
            0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
            0x02, 0x20, 
            0xAA.toByte(), 0xBB.toByte(), 0xCC.toByte(), 0xDD.toByte(), 0xEE.toByte(), 0xFF.toByte(), 0x00, 0x11, 
            0xAA.toByte(), 0xBB.toByte(), 0xCC.toByte(), 0xDD.toByte(), 0xEE.toByte(), 0xFF.toByte(), 0x00, 0x11, 
            0xAA.toByte(), 0xBB.toByte(), 0xCC.toByte(), 0xDD.toByte(), 0xEE.toByte(), 0xFF.toByte(), 0x00, 0x11, 
            0xAA.toByte(), 0xBB.toByte(), 0xCC.toByte(), 0xDD.toByte(), 0xEE.toByte(), 0xFF.toByte(), 0x00, 0x11
        )
        val raw = CryptiLinkKeyEngine.derToRaw64(der)
        assertEquals(64, raw.size)
        assertEquals(0x11.toByte(), raw[0])
        assertEquals(0xAA.toByte(), raw[32])
    }

    @Test
    fun testWalletIdHashConsistency() {
        val walletId = "CL-VAULT-TEST-001"
        // Node.js: crypto.createHash('sha256').update(walletId).digest().subarray(0, 8)
        // Let's compute it in Kotlin:
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(walletId.toByteArray(Charsets.UTF_8)).copyOfRange(0, 8)
        
        // Let's use Node.js to verify it
        val hashHex = hash.joinToString("") { "%02x".format(it) }
        val nodeScript = "console.log(require('crypto').createHash('sha256').update('$walletId').digest('hex').substring(0, 16))"
        val process = ProcessBuilder("node", "-e", nodeScript).start()
        val nodeHex = process.inputStream.bufferedReader().readText().trim()
        assertEquals(nodeHex, hashHex)
    }

    @Test
    fun testEndToEndSigningAndNodeVerification() {
        // This is Deliverable 5 Integration Test
        
        // 1. Generate key pair
        val result = CryptiLinkKeyEngine.generateKeyPair()
        assertTrue(result is GenerateKeyResult.SUCCESS || result is GenerateKeyResult.ALREADY_EXISTS)
        
        // 2. Export public key
        val pubKeyBase64 = CryptiLinkKeyEngine.getPublicKeyBase64()
        
        // 3. Construct transaction
        val walletId = "CL-VAULT-TEST-001"
        val amountRupees = 150.00
        val sequenceCounter = 1
        val timestampUnix = 1680000000 // A fixed timestamp
        
        // 4. Sign payload
        val payload84 = TokenSigner.buildAndSignPayload(walletId, amountRupees, sequenceCounter, timestampUnix)
        assertEquals(84, payload84.size)
        
        // 5. Verify using Bank Server Node.js
        val payloadBase64 = Base64.getEncoder().encodeToString(payload84)
        
        // Write a temporary Node.js script to run the bank server verification
        val script = """
            const { deserializeCompactPayload, verifyCompactPayloadSignature } = require('./cryptilink-bank-server/dist/crypto/compactPayload.js');
            const payloadBuf = Buffer.from('$payloadBase64', 'base64');
            const payload = deserializeCompactPayload(payloadBuf);
            const pubKey = '$pubKeyBase64';
            const isValid = verifyCompactPayloadSignature(payload, pubKey);
            if (isValid) {
                console.log('PASS');
            } else {
                console.error('FAIL');
                process.exit(1);
            }
        """.trimIndent()
        
        val tempFile = File.createTempFile("verify", ".js")
        // Since we are running inside CryptiLink/mobile/android, we need to point to the root
        val rootDir = File("../../..").absolutePath
        val adjustedScript = script.replace("./cryptilink-bank-server", "$rootDir/cryptilink-bank-server")
        tempFile.writeText(adjustedScript)
        
        val process = ProcessBuilder("node", tempFile.absolutePath).start()
        process.waitFor()
        val output = process.inputStream.bufferedReader().readText().trim()
        val error = process.errorStream.bufferedReader().readText().trim()
        
        tempFile.delete()
        
        assertEquals("Verification script output: ${error}", "PASS", output)
    }
}