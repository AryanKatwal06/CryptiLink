package com.cryptilink.crypto

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CryptiLinkKeyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "CryptiLinkKey"
    }

    @ReactMethod
    fun generateKeyPair(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            when (val result = CryptiLinkKeyEngine.generateKeyPair()) {
                is GenerateKeyResult.SUCCESS -> promise.resolve("SUCCESS")
                is GenerateKeyResult.ALREADY_EXISTS -> promise.resolve("ALREADY_EXISTS")
                is GenerateKeyResult.ERROR -> promise.reject("KEY_ERROR", result.message)
            }
        }
    }

    @ReactMethod
    fun getPublicKeyBase64(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val pubKey = CryptiLinkKeyEngine.getPublicKeyBase64()
                promise.resolve(pubKey)
            } catch (e: Exception) {
                promise.reject("KEY_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun signPayload(payloadBase64: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // The JS bridge passes the raw string inputs to sign, but the prompt says 
                // "accepts base64-encoded payload bytes, calls TokenSigner.buildAndSignPayload() with the decoded values"
                // Wait, signPayload takes base64 payload bytes and signs them OR takes the values?
                // The spec says: signPayload(payloadBase64: string): Promise<string>
                // So the JS side will serialize the 20 bytes and pass as base64, OR it passes the values?
                // The prompt says: "For signPayload: accepts base64-encoded payload bytes, calls TokenSigner.buildAndSignPayload() with the decoded values"
                // But buildAndSignPayload takes (walletId, amountRupees, sequenceCounter, timestampUnix)
                // Let's just use CryptiLinkKeyEngine.signPayload for base64 payload bytes directly, 
                // OR add another method buildAndSignPayload to the module.
                // Since NativeCryptiLinkKey specifies signPayload(payloadBase64: string), we will just decode it and sign it using CryptiLinkKeyEngine.
                val payloadBytes = Base64.decode(payloadBase64, Base64.DEFAULT)
                val rawSignature = CryptiLinkKeyEngine.signPayload(payloadBytes)
                
                // Return just the signature or the whole payload? The prompt:
                // "Returns: base64 of the 84-byte signed compact payload"
                // If the input is the 20-byte payload, we just concat.
                val finalPayload = ByteArray(payloadBytes.size + rawSignature.size)
                System.arraycopy(payloadBytes, 0, finalPayload, 0, payloadBytes.size)
                System.arraycopy(rawSignature, 0, finalPayload, payloadBytes.size, rawSignature.size)
                
                promise.resolve(Base64.encodeToString(finalPayload, Base64.NO_WRAP))
            } catch (e: Exception) {
                promise.reject("SIGN_ERROR", e.message)
            }
        }
    }
    
    @ReactMethod
    fun buildAndSignPayload(walletId: String, amountRupees: Double, sequenceCounter: Int, timestampUnix: Int, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resultBytes = TokenSigner.buildAndSignPayload(walletId, amountRupees, sequenceCounter, timestampUnix)
                promise.resolve(Base64.encodeToString(resultBytes, Base64.NO_WRAP))
            } catch (e: Exception) {
                promise.reject("SIGN_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun hasExistingKey(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            promise.resolve(CryptiLinkKeyEngine.hasExistingKey())
        }
    }

    @ReactMethod
    fun getKeySecurityLevel(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            promise.resolve(CryptiLinkKeyEngine.getKeySecurityLevel())
        }
    }

    @ReactMethod
    fun getKeystoreInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            val info = CryptiLinkKeyEngine.getKeystoreInfo()
            val map = Arguments.createMap()
            info.forEach { (k, v) -> map.putString(k, v) }
            promise.resolve(map)
        }
    }
}