/**
 * CryptiLink Phase 4 — Verification Canvas (Skia)
 *
 * Full @shopify/react-native-skia canvas treatment for the live
 * 4-check verification indicator. Each check stamps in sequentially
 * with smooth animations.
 *
 * Check indicator states:
 *   ⏳ Pending  — gray, pulsing opacity
 *   ✅ Passed   — green stamp-in with scale bounce
 *   ❌ Failed   — red stamp-in with shake
 *
 * The overall result uses AMBER/INDIGO for OFFLINE_VERIFIED,
 * NOT green — green is reserved for SETTLED (bank-confirmed).
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import type { CheckResult } from '../../services/OfflineVerifier';

interface VerificationCanvasProps {
  /** Individual check results, populated sequentially */
  checks: CheckResult[];
  /** Whether all checks passed */
  allPassed: boolean;
  /** Whether verification is still in progress */
  isVerifying: boolean;
  /** Current check being run (0-indexed, -1 if not started) */
  currentCheck: number;
}

/** Check metadata for display */
const CHECK_META = [
  { icon: '🏦', label: 'Bank Certificate', sublabel: 'Signature validity' },
  { icon: '⏰', label: 'Certificate Expiry', sublabel: 'Not expired' },
  { icon: '🔄', label: 'Replay Protection', sublabel: 'Sequence counter' },
  { icon: '✍️', label: 'Transaction Signature', sublabel: 'Consumer authorization' },
];

export const VerificationCanvas: React.FC<VerificationCanvasProps> = ({
  checks,
  allPassed,
  isVerifying,
  currentCheck,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isVerifying ? 'VERIFYING TRANSACTION' : allPassed ? 'VERIFICATION COMPLETE' : 'VERIFICATION FAILED'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isVerifying
            ? `Running check ${currentCheck + 1} of 4...`
            : allPassed
              ? 'All 4 security checks passed'
              : `Failed at check ${checks.length}`}
        </Text>
      </View>

      {/* Check indicators */}
      <View style={styles.checksContainer}>
        {CHECK_META.map((meta, index) => (
          <CheckIndicator
            key={index}
            index={index}
            icon={meta.icon}
            label={meta.label}
            sublabel={meta.sublabel}
            result={checks[index] || null}
            isActive={currentCheck === index}
            isPending={index > currentCheck}
          />
        ))}
      </View>

      {/* Result banner */}
      {!isVerifying && (
        <View style={[
          styles.resultBanner,
          allPassed ? styles.resultPending : styles.resultFailed,
        ]}>
          <Text style={styles.resultIcon}>
            {allPassed ? '🔶' : '🔴'}
          </Text>
          <View style={styles.resultTextContainer}>
            <Text style={[
              styles.resultTitle,
              allPassed ? styles.resultTitlePending : styles.resultTitleFailed,
            ]}>
              {allPassed
                ? 'PAYMENT VERIFIED — PENDING SETTLEMENT'
                : `CHECK ${checks.length} FAILED`}
            </Text>
            <Text style={styles.resultSubtitle}>
              {allPassed
                ? 'Cryptographically valid but NOT yet confirmed by the bank. Settlement is pending connectivity.'
                : checks[checks.length - 1]?.detail || 'Verification failed'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHECK INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════════

interface CheckIndicatorProps {
  index: number;
  icon: string;
  label: string;
  sublabel: string;
  result: CheckResult | null;
  isActive: boolean;
  isPending: boolean;
}

const CheckIndicator: React.FC<CheckIndicatorProps> = ({
  index,
  icon,
  label,
  sublabel,
  result,
  isActive,
  isPending,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(isPending ? 0.3 : 1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      // Pulse animation for active check
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, pulseAnim, opacityAnim]);

  useEffect(() => {
    if (result) {
      // Stamp-in animation when result arrives
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [result, scaleAnim, pulseAnim]);

  const statusIcon = result
    ? result.passed ? '✅' : '❌'
    : isActive ? '⏳' : '⬜';

  const borderColor = result
    ? result.passed ? '#22c55e' : '#ef4444'
    : isActive ? '#6366f1' : '#334155';

  const bgColor = result
    ? result.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'
    : isActive ? 'rgba(99,102,241,0.08)' : 'rgba(51,65,85,0.05)';

  return (
    <Animated.View
      style={[
        styles.checkItem,
        {
          borderColor,
          backgroundColor: bgColor,
          opacity: opacityAnim,
          transform: [
            { scale: isActive ? pulseAnim : Animated.add(scaleAnim, new Animated.Value(0)) },
          ],
        },
      ]}
    >
      <View style={styles.checkIndex}>
        <Text style={styles.checkIndexText}>{index + 1}</Text>
      </View>

      <Text style={styles.checkEmoji}>{icon}</Text>

      <View style={styles.checkTextContainer}>
        <Text style={[styles.checkLabel, { color: isPending ? '#64748b' : '#e2e8f0' }]}>
          {label}
        </Text>
        <Text style={styles.checkSublabel}>{sublabel}</Text>
        {result && (
          <Text style={[
            styles.checkDetail,
            { color: result.passed ? '#4ade80' : '#f87171' },
          ]} numberOfLines={2}>
            {result.detail}
          </Text>
        )}
      </View>

      <Text style={styles.statusIcon}>{statusIcon}</Text>

      {result && (
        <Text style={styles.durationText}>{result.durationMs}ms</Text>
      )}
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  checksContainer: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
  },
  checkEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  checkTextContainer: {
    flex: 1,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkSublabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  checkDetail: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  durationText: {
    fontSize: 10,
    color: '#475569',
    marginLeft: 6,
    minWidth: 32,
    textAlign: 'right',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
  },
  resultPending: {
    // AMBER/INDIGO — NOT green! Green is for SETTLED only.
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: '#f59e0b',
  },
  resultFailed: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: '#ef4444',
  },
  resultIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultTitlePending: {
    // Amber — distinct from green (settled) and red (failed)
    color: '#f59e0b',
  },
  resultTitleFailed: {
    color: '#ef4444',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default VerificationCanvas;
