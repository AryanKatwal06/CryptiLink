/**
 * CryptiLink Phase 4 — Verification Screen
 *
 * Shows the live 4-check verification process as it runs, with
 * checks stamping in sequentially. Displays the final result with
 * the critical OFFLINE_VERIFIED (amber) vs failure (red) distinction.
 *
 * HAPTIC GRAMMAR:
 *   Light (50ms)  — Signal/payload detected (in ListeningScreen)
 *   Medium (100ms) — Verification passed, now pending settlement
 *                    (this screen, on all 4 checks passing)
 *   Heavy+double   — NOT triggered here. Reserved for actual
 *                    settlement confirmation (Deliverable 7 only).
 *                    The medium and heavy+double MUST NOT feel
 *                    identical since they mean different things.
 *
 *   Failure: 3 short sharp pulses (30ms × 3, 80ms apart)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ScrollView,
  StatusBar,
} from 'react-native';
import VerificationCanvas from '../../components/merchant/VerificationCanvas';
import { verifyTransaction, type CheckResult, type VerificationResult } from '../../services/OfflineVerifier';
import {
  recordVerifiedTransaction,
  recordRejectedTransaction,
} from '../../db/TransactionLedger';
import type { IncomingPayload } from '../../services/TransactionReceiver';

interface VerificationScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route: {
    params: {
      payload: IncomingPayload;
    };
  };
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { payload } = route.params;

  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [currentCheck, setCurrentCheck] = useState(-1);
  const [isVerifying, setIsVerifying] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const hasRun = useRef(false);

  const runVerification = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    setIsVerifying(true);

    // Simulate sequential check display with small delays
    // for the visual stamp-in effect
    for (let i = 0; i < 4; i++) {
      setCurrentCheck(i);

      // Small delay for visual effect
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
    }

    // Run the actual verification
    const verificationResult = await verifyTransaction(payload);

    // Display checks sequentially with animation delays
    for (let i = 0; i < verificationResult.checks.length; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      setChecks((prev) => [...prev, verificationResult.checks[i]]);
      setCurrentCheck(i + 1);
    }

    setIsVerifying(false);
    setResult(verificationResult);

    // Haptic feedback based on result
    if (verificationResult.passed) {
      // Medium haptic — verification passed, pending settlement
      // NOT the same as heavy+double (which means bank-confirmed)
      Vibration.vibrate(100);

      // Record in ledger as OFFLINE_VERIFIED
      await recordVerifiedTransaction({
        walletIdHash: payload.walletIdHash,
        walletId: verificationResult.certificate?.wallet_id || null,
        amount: payload.amount,
        sequenceCounter: payload.sequenceCounter,
        signature: payload.signature,
        channel: payload.channel,
        timestamp: payload.timestamp,
        receivedAt: payload.receivedAt,
        verificationChecks: JSON.stringify(verificationResult.checks),
      });
    } else {
      // Failure: 3 short sharp pulses
      Vibration.vibrate([0, 30, 80, 30, 80, 30]);

      // Record rejected attempt (never silently discarded)
      await recordRejectedTransaction({
        walletIdHash: payload.walletIdHash,
        amount: payload.amount,
        sequenceCounter: payload.sequenceCounter,
        channel: payload.channel,
        timestamp: payload.timestamp,
        receivedAt: payload.receivedAt,
        failedCheck: `Check ${verificationResult.failedCheck}`,
        rejectionReason: verificationResult.rejectionReason || 'UNKNOWN',
      });
    }
  }, [payload]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TRANSACTION VERIFICATION</Text>
      </View>

      {/* Transaction info */}
      <View style={styles.txInfo}>
        <View style={styles.txAmount}>
          <Text style={styles.txCurrency}>₹</Text>
          <Text style={styles.txAmountValue}>{payload.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.txMeta}>
          <View style={styles.txMetaRow}>
            <Text style={styles.txMetaLabel}>Channel</Text>
            <Text style={styles.txMetaValue}>
              {payload.channel === 'SMS' ? '📱 SMS' : '🔊 Acoustic'}
            </Text>
          </View>
          <View style={styles.txMetaRow}>
            <Text style={styles.txMetaLabel}>Wallet</Text>
            <Text style={styles.txMetaValue}>
              {payload.walletIdHash.substring(0, 8)}...
            </Text>
          </View>
          <View style={styles.txMetaRow}>
            <Text style={styles.txMetaLabel}>Sequence</Text>
            <Text style={styles.txMetaValue}>#{payload.sequenceCounter}</Text>
          </View>
        </View>
      </View>

      {/* Verification canvas */}
      <ScrollView style={styles.canvasContainer}>
        <VerificationCanvas
          checks={checks}
          allPassed={result?.passed ?? false}
          isVerifying={isVerifying}
          currentCheck={currentCheck}
        />

        {/* Duration */}
        {result && (
          <Text style={styles.durationText}>
            Total verification time: {result.totalDurationMs}ms
          </Text>
        )}

        {/* Action buttons */}
        {!isVerifying && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.navigate('MerchantDashboard')}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>
                {result?.passed ? 'BACK TO DASHBOARD' : 'DISMISS'}
              </Text>
            </TouchableOpacity>

            {result?.passed && (
              <TouchableOpacity
                style={styles.listenAgainButton}
                onPress={() => navigation.navigate('Listening')}
                activeOpacity={0.8}
              >
                <Text style={styles.listenAgainText}>
                  LISTEN FOR ANOTHER
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
    fontSize: 13,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 2,
  },
  txInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51,65,85,0.3)',
  },
  txAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  txCurrency: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '300',
    marginRight: 4,
  },
  txAmountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  txMeta: {
    gap: 6,
  },
  txMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txMetaLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  txMetaValue: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
  },
  durationText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  doneButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  listenAgainButton: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderColor: 'rgba(99,102,241,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  listenAgainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818cf8',
    letterSpacing: 1,
  },
});

export default VerificationScreen;
