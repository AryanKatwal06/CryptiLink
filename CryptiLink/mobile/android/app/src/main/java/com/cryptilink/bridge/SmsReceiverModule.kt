package com.cryptilink.bridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * CryptiLink Phase 4 — SMS Receiver Native Module
 *
 * BroadcastReceiver that listens for inbound SMS messages containing
 * compact transaction payloads. The payload format is Phase 3's
 * 84-byte binary payload, base64-encoded in the SMS body.
 *
 * SMS PAYLOAD FORMAT (in SMS body):
 *   "CL:" + <base64 of 84-byte binary payload>
 *
 * The "CL:" prefix identifies CryptiLink transaction SMS messages
 * and distinguishes them from regular SMS.
 *
 * On receiving a valid payload, this module emits a
 * 'onTransactionReceived' event to JavaScript with the deserialized
 * payload fields and channel = 'SMS'.
 */
class SmsReceiverModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "CryptiLinkSmsReceiver"
        const val EVENT_TRANSACTION_RECEIVED = "onTransactionReceived"
        const val PAYLOAD_PREFIX = "CL:"
        const val COMPACT_PAYLOAD_SIZE = 84
        const val WALLET_ID_HASH_SIZE = 8
        const val SIGNATURE_SIZE = 64
    }

    private var smsReceiver: BroadcastReceiver? = null
    private var isListening = false

    override fun getName(): String = MODULE_NAME

    /**
     * Starts listening for inbound CryptiLink SMS messages.
     * Registers a BroadcastReceiver for SMS_RECEIVED_ACTION.
     */
    @ReactMethod
    fun startListening(promise: Promise) {
        if (isListening) {
            promise.resolve("Already listening")
            return
        }

        try {
            smsReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

                    val messages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                        Telephony.Sms.Intents.getMessagesFromIntent(intent)
                    } else {
                        @Suppress("DEPRECATION")
                        val pdus = intent.extras?.get("pdus") as? Array<*> ?: return
                        pdus.mapNotNull { pdu ->
                            @Suppress("DEPRECATION")
                            SmsMessage.createFromPdu(pdu as ByteArray)
                        }.toTypedArray()
                    }

                    // Concatenate multi-part SMS bodies
                    val fullBody = messages
                        .mapNotNull { it?.messageBody }
                        .joinToString("")
                        .trim()

                    // Check for CryptiLink payload prefix
                    if (fullBody.startsWith(PAYLOAD_PREFIX)) {
                        val base64Payload = fullBody.substring(PAYLOAD_PREFIX.length)
                        processPayload(base64Payload, messages.firstOrNull()?.originatingAddress)
                    }
                }
            }

            val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
            filter.priority = IntentFilter.SYSTEM_HIGH_PRIORITY
            reactContext.registerReceiver(smsReceiver, filter)
            isListening = true

            promise.resolve("SMS listener started")
        } catch (e: Exception) {
            promise.reject("SMS_LISTENER_ERROR", "Failed to start SMS listener: ${e.message}", e)
        }
    }

    /**
     * Stops listening for SMS messages.
     */
    @ReactMethod
    fun stopListening(promise: Promise) {
        try {
            smsReceiver?.let {
                reactContext.unregisterReceiver(it)
                smsReceiver = null
            }
            isListening = false
            promise.resolve("SMS listener stopped")
        } catch (e: Exception) {
            promise.reject("SMS_LISTENER_ERROR", "Failed to stop SMS listener: ${e.message}", e)
        }
    }

    /**
     * Returns whether the receiver is currently listening.
     */
    @ReactMethod
    fun isActive(promise: Promise) {
        promise.resolve(isListening)
    }

    /**
     * Processes a base64-encoded 84-byte compact payload from SMS.
     *
     * Deserializes the binary format:
     *   wallet_id_hash:    8 bytes  (first 8 bytes of SHA-256(wallet_id))
     *   amount:            4 bytes  int32 BE (paise, divide by 100 for ₹)
     *   sequence_counter:  4 bytes  int32 BE
     *   timestamp:         4 bytes  int32 BE (unix seconds)
     *   signature:        64 bytes  ECDSA raw (r‖s)
     *   TOTAL:            84 bytes
     */
    private fun processPayload(base64Payload: String, senderAddress: String?) {
        try {
            val payloadBytes = Base64.decode(base64Payload, Base64.DEFAULT)

            if (payloadBytes.size != COMPACT_PAYLOAD_SIZE) {
                emitError("Invalid payload size: ${payloadBytes.size}, expected $COMPACT_PAYLOAD_SIZE")
                return
            }

            val buffer = ByteBuffer.wrap(payloadBytes).order(ByteOrder.BIG_ENDIAN)

            // wallet_id_hash: 8 bytes → hex string
            val hashBytes = ByteArray(WALLET_ID_HASH_SIZE)
            buffer.get(hashBytes)
            val walletIdHash = hashBytes.joinToString("") { "%02x".format(it) }

            // amount: 4 bytes int32 BE (paise) → convert to ₹
            val paise = buffer.int
            val amount = paise / 100.0

            // sequence_counter: 4 bytes int32 BE
            val sequenceCounter = buffer.int

            // timestamp: 4 bytes int32 BE
            val timestamp = buffer.int

            // signature: 64 bytes raw (r‖s) → base64
            val sigBytes = ByteArray(SIGNATURE_SIZE)
            buffer.get(sigBytes)
            val signature = Base64.encodeToString(sigBytes, Base64.NO_WRAP)

            // Emit to JavaScript
            val payload = Arguments.createMap().apply {
                putString("walletIdHash", walletIdHash)
                putDouble("amount", amount)
                putInt("sequenceCounter", sequenceCounter)
                putInt("timestamp", timestamp)
                putString("signature", signature)
                putString("channel", "SMS")
                putString("senderAddress", senderAddress ?: "unknown")
                putDouble("receivedAt", (System.currentTimeMillis() / 1000).toDouble())
            }

            sendEvent(EVENT_TRANSACTION_RECEIVED, payload)
        } catch (e: Exception) {
            emitError("Failed to decode SMS payload: ${e.message}")
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun emitError(message: String) {
        val errorMap = Arguments.createMap().apply {
            putString("error", message)
            putString("channel", "SMS")
        }
        sendEvent("onTransactionError", errorMap)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        smsReceiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: Exception) { }
        }
        isListening = false
    }
}
