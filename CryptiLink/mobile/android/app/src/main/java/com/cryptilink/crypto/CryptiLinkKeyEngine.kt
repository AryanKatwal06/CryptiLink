package com.cryptilink.crypto

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.cert.Certificate

sealed class GenerateKeyResult {
    object SUCCESS : GenerateKeyResult()
    object ALREADY_EXISTS : GenerateKeyResult()
    data class ERROR(val message: String) : GenerateKeyResult()
}

    private const val KEY_ALIAS = "CryptiLinkConsumerKey"
    var KEYSTORE_PROVIDER = "AndroidKeyStore"

    fun hasExistingKey(): Boolean {
        return try {
            val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keyStore.load(null)
            keyStore.containsAlias(KEY_ALIAS)
        } catch (e: Exception) {
            false
        }
    }

    fun generateKeyPair(): GenerateKeyResult {
        try {
            if (hasExistingKey()) {
                return GenerateKeyResult.ALREADY_EXISTS
            }

            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC, KEYSTORE_PROVIDER
            )

            if (KEYSTORE_PROVIDER != "AndroidKeyStore") {
                keyPairGenerator.initialize(java.security.spec.ECGenParameterSpec("secp256r1"))
                keyPairGenerator.generateKeyPair()
                return GenerateKeyResult.SUCCESS
            }

            val builder = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
            .setAlgorithmParameterSpec(java.security.spec.ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setUserAuthenticationRequired(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                builder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL)
            } else {
                builder.setUserAuthenticationValidityDurationSeconds(-1)
            }

            var strongBoxAvailable = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                builder.setIsStrongBoxBacked(true)
                try {
                    keyPairGenerator.initialize(builder.build())
                    keyPairGenerator.generateKeyPair()
                    strongBoxAvailable = true
                    return GenerateKeyResult.SUCCESS
                } catch (e: Exception) {
                    // StrongBox unavailable, fallback to TEE
                }
            }
            
            if (!strongBoxAvailable) {
                // Fallback to TEE
                val fallbackBuilder = KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
                )
                .setAlgorithmParameterSpec(java.security.spec.ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(true)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    fallbackBuilder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL)
                } else {
                    fallbackBuilder.setUserAuthenticationValidityDurationSeconds(-1)
                }
                
                keyPairGenerator.initialize(fallbackBuilder.build())
                keyPairGenerator.generateKeyPair()
            }
            
            return GenerateKeyResult.SUCCESS
        } catch (e: Exception) {
            return GenerateKeyResult.ERROR(e.message ?: "Unknown error")
        }
    }

    fun getPublicKeyBase64(): String {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)
        val cert: Certificate = keyStore.getCertificate(KEY_ALIAS)
            ?: throw Exception("Key not found in AndroidKeyStore")
        
        // Export public key as X.509 SPKI DER format encoded as base64
        val publicKeyBytes = cert.publicKey.encoded
        return Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)
    }

    fun signPayload(payloadBytes: ByteArray): ByteArray {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)
        val privateKey = keyStore.getKey(KEY_ALIAS, null) as? PrivateKey
            ?: throw Exception("Private key not found")
        
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey)
        signature.update(payloadBytes)
        val derSignature = signature.sign()
        
        return derToRaw64(derSignature)
    }

    fun getKeySecurityLevel(): String {
        try {
            val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
            keyStore.load(null)
            val privateKey = keyStore.getKey(KEY_ALIAS, null) as? PrivateKey ?: return "UNKNOWN"
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val factory = KeyFactory.getInstance(privateKey.algorithm, KEYSTORE_PROVIDER)
                val keyInfo = factory.getKeySpec(privateKey, KeyInfo::class.java)
                return when (keyInfo.securityLevel) {
                    KeyProperties.SECURITY_LEVEL_STRONGBOX -> "STRONGBOX"
                    KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT -> "TEE"
                    else -> "UNKNOWN"
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val factory = KeyFactory.getInstance(privateKey.algorithm, KEYSTORE_PROVIDER)
                val keyInfo = factory.getKeySpec(privateKey, KeyInfo::class.java)
                return if (keyInfo.isInsideSecureHardware) {
                    "TEE" // Best-effort fallback; could be StrongBox or TEE, but we can't definitively differentiate via API on 28-30
                } else {
                    "UNKNOWN"
                }
            }
            return "TEE"
        } catch (e: Exception) {
            return "UNKNOWN"
        }
    }

    fun getKeystoreInfo(): Map<String, String> {
        val exists = hasExistingKey()
        return mapOf(
            "securityLevel" to if (exists) getKeySecurityLevel() else "UNKNOWN",
            "apiLevel" to Build.VERSION.SDK_INT.toString(),
            "keyExists" to exists.toString(),
            "alias" to KEY_ALIAS
        )
    }

    fun derToRaw64(derBytes: ByteArray): ByteArray {
        // DER sequence: 0x30, length, 0x02, rLength, rBytes, 0x02, sLength, sBytes
        var offset = 0
        require(derBytes[offset++] == 0x30.toByte()) { "Invalid DER sequence" }
        var length = derBytes[offset++].toInt() and 0xFF
        if (length and 0x80 != 0) {
            val lenBytes = length and 0x7F
            offset += lenBytes
        }
        
        require(derBytes[offset++] == 0x02.toByte()) { "Invalid DER integer (r)" }
        val rLength = derBytes[offset++].toInt() and 0xFF
        var rOffset = offset
        var rLen = rLength
        if (derBytes[rOffset] == 0x00.toByte() && rLen > 1) {
            rOffset++
            rLen--
        }
        val rBytes = derBytes.copyOfRange(rOffset, rOffset + rLen)
        offset += rLength
        
        require(derBytes[offset++] == 0x02.toByte()) { "Invalid DER integer (s)" }
        val sLength = derBytes[offset++].toInt() and 0xFF
        var sOffset = offset
        var sLen = sLength
        if (derBytes[sOffset] == 0x00.toByte() && sLen > 1) {
            sOffset++
            sLen--
        }
        val sBytes = derBytes.copyOfRange(sOffset, sOffset + sLen)
        
        val raw64 = ByteArray(64)
        val rStart = 32 - rBytes.size
        System.arraycopy(rBytes, 0, raw64, if (rStart > 0) rStart else 0, Math.min(32, rBytes.size))
        val sStart = 32 - sBytes.size
        System.arraycopy(sBytes, 0, raw64, 32 + (if (sStart > 0) sStart else 0), Math.min(32, sBytes.size))
        return raw64
    }
}