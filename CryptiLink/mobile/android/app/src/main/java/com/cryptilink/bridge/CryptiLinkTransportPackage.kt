package com.cryptilink.bridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * CryptiLink Phase 3/4 — React Native Transport Bridge Package
 *
 * Registers native modules for dual-channel transaction transport:
 * - SmsReceiverModule: BroadcastReceiver for inbound SMS compact payloads
 * - AcousticReceiverModule: AudioRecord + Goertzel + Reed-Solomon decoder
 *
 * Both modules emit 'onTransactionReceived' events to JavaScript with
 * the deserialized compact payload and the channel identifier.
 */
class CryptiLinkTransportPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(
            SmsReceiverModule(reactContext),
            AcousticReceiverModule(reactContext)
        )
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
