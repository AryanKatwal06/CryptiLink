/**
 * CryptiLink Phase 4 — Listening Screen
 *
 * Full-screen listening mode where the merchant activates
 * SMS (passive) and/or Acoustic (active) channels to receive
 * incoming transaction payloads from consumers.
 *
 * SMS is always-on (BroadcastReceiver), Acoustic requires
 * explicit activation (uses microphone).
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  StatusBar,
} from 'react-native';
import {
  startListening,
  stopListening,
  startAcousticListening,
  stopAcousticListening,
  isAcousticActive,
  onPayloadReceived,
  onAcousticStatus,
  onTransportError,
  type IncomingPayload,
  type AcousticStatus,
} from '../../services/TransactionReceiver';
import { verifyTransaction } from '../../services/OfflineVerifier';
import {
  recordVerifiedTransaction,
  recordRejectedTransaction,
} from '../../db/TransactionLedger';

interface ListeningScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export const ListeningScreen: React.FC<ListeningScreenProps> = ({ navigation }) => {
  const [isActive, setIsActive] = useState(false);
  const [acousticEnabled, setAcousticEnabled] = useState(false);
  const [lastStatus, setLastStatus] = useState<string>('Idle');
  const [receivedCount, setReceivedCount] = useState(0);
  const [lastPayload, setLastPayload] = useState<IncomingPayload | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when listening
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Ring expand animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
    }
  }, [isActive, pulseAnim, ringAnim]);

  // Handle incoming payloads
  const handlePayload = useCallback(async (payload: IncomingPayload) => {
    setLastPayload(payload);
    setReceivedCount((c) => c + 1);
    setLastStatus(`Received ₹${payload.amount} via ${payload.channel}`);

    // Haptic: light tap — signal/payload detected
    Vibration.vibrate(50);

    // Navigate to verification screen
    navigation.navigate('Verification', { payload });
  }, [navigation]);

  // Handle acoustic status
  const handleAcousticStatus = useCallback((status: AcousticStatus) => {
    const statusMessages: Record<string, string> = {
      preamble_detected: '📡 Signal detected — receiving...',
      receiving_payload: '📡 Receiving payload data...',
      signal_lost: '📡 Signal lost',
    };
    setLastStatus(statusMessages[status.status] || status.status);

    if (status.status === 'preamble_detected') {
      Vibration.vibrate(30); // Light haptic for signal detection
    }
  }, []);

  // Start/stop listening
  const toggleListening = useCallback(async () => {
    if (isActive) {
      await stopListening();
      setIsActive(false);
      setLastStatus('Stopped');
    } else {
      await startListening(acousticEnabled);
      setIsActive(true);
      setLastStatus('Listening for transactions...');
    }
  }, [isActive, acousticEnabled]);

  // Toggle acoustic channel
  const toggleAcoustic = useCallback(async () => {
    if (acousticEnabled) {
      await stopAcousticListening();
      setAcousticEnabled(false);
    } else {
      await startAcousticListening();
      setAcousticEnabled(true);
    }
  }, [acousticEnabled]);

  // Subscribe to events
  useEffect(() => {
    const unsubs = [
      onPayloadReceived(handlePayload),
      onAcousticStatus(handleAcousticStatus),
      onTransportError((err) => {
        setLastStatus(`Error (${err.channel}): ${err.error}`);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [handlePayload, handleAcousticStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening().catch(() => { /* ignore */ });
    };
  }, []);

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LISTENING MODE</Text>
      </View>

      {/* Central listening indicator */}
      <View style={styles.centerContainer}>
        {/* Expanding ring animation */}
        {isActive && (
          <Animated.View style={[
            styles.ring,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]} />
        )}

        {/* Main button */}
        <TouchableOpacity
          onPress={toggleListening}
          activeOpacity={0.7}
        >
          <Animated.View style={[
            styles.listeningOrb,
            isActive && styles.listeningOrbActive,
            { transform: [{ scale: pulseAnim }] },
          ]}>
            <Text style={styles.orbIcon}>
              {isActive ? '📡' : '⏸'}
            </Text>
            <Text style={styles.orbLabel}>
              {isActive ? 'LISTENING' : 'TAP TO START'}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Channel toggles */}
      <View style={styles.channelsContainer}>
        <View style={styles.channelRow}>
          <View style={[styles.channelIndicator, styles.channelSms]}>
            <Text style={styles.channelIcon}>📱</Text>
            <View>
              <Text style={styles.channelLabel}>SMS Channel</Text>
              <Text style={styles.channelStatus}>
                {isActive ? 'Active (passive)' : 'Inactive'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.channelToggle,
              acousticEnabled && styles.channelToggleActive,
            ]}
            onPress={toggleAcoustic}
            disabled={!isActive}
          >
            <Text style={styles.channelIcon}>🔊</Text>
            <View>
              <Text style={styles.channelLabel}>Acoustic</Text>
              <Text style={styles.channelStatus}>
                {acousticEnabled ? 'Active (mic on)' : 'Tap to enable'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{lastStatus}</Text>
        {receivedCount > 0 && (
          <Text style={styles.receivedCount}>
            {receivedCount} received
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  listeningOrb: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 2,
    borderColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningOrbActive: {
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderColor: '#818cf8',
  },
  orbIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  orbLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: 2,
  },
  channelsContainer: {
    padding: 20,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  channelIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  channelSms: {},
  channelToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.3)',
    backgroundColor: 'rgba(30,41,59,0.5)',
  },
  channelToggleActive: {
    borderColor: 'rgba(245,158,11,0.3)',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  channelIcon: {
    fontSize: 20,
  },
  channelLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  channelStatus: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51,65,85,0.3)',
  },
  statusText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  receivedCount: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '600',
  },
});

export default ListeningScreen;
