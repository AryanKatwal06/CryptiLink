package com.cryptilink.crypto

import java.nio.ByteBuffer
import java.security.MessageDigest
import kotlin.math.roundToInt

object TokenSigner {
    fun buildAndSignPayload(
        walletId: String,
        amountRupees: Double,
        sequenceCounter: Int,
        timestampUnix: Int
    ): ByteArray {
        // 1. Compute walletIdHash (first 8 bytes of SHA-256)
        val digest = MessageDigest.getInstance("SHA-256")
        val fullHash = digest.digest(walletId.toByteArray(Charsets.UTF_8))
        val walletIdHash = fullHash.copyOfRange(0, 8)

        // 2. Convert amountRupees to paise (Int32)
        val paise = (amountRupees * 100).roundToInt()

        // 3. Serialize 20-byte payload data
        val payloadData = ByteBuffer.allocate(20)
        payloadData.put(walletIdHash)
        payloadData.putInt(paise)
        payloadData.putInt(sequenceCounter)
        payloadData.putInt(timestampUnix)
        
        val payloadBytes = payloadData.array()
        
        // 4. Sign payload
        val rawSignature = CryptiLinkKeyEngine.signPayload(payloadBytes)
        
        // 5. Concatenate
        val finalPayload = ByteBuffer.allocate(20 + 64)
        finalPayload.put(payloadBytes)
        finalPayload.put(rawSignature)
        
        val resultBytes = finalPayload.array()
        require(resultBytes.size == 84) { "Payload size must be exactly 84 bytes" }
        
        return resultBytes
    }
}