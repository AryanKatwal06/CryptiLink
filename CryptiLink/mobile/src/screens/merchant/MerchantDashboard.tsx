/**
 * CryptiLink Phase 4 — Merchant Dashboard Screen
 *
 * The merchant's home screen showing transaction summary cards,
 * quick-action listening mode button, and totals per status.
 *
 * VISUAL DESIGN:
 * - Dark theme with premium glassmorphism cards
 * - Three summary cards: Pending (amber), Settled (green), Rejected (red)
 * - Prominent "Start Listening" CTA
 * - Quick navigation to history and settings
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { getTransactionSummary } from '../../db/TransactionLedger';
import { getOnboardingStatus } from '../../services/MerchantOnboarding';

interface DashboardProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

interface Summary {
  pending: number;
  settled: number;
  rejected: number;
  pendingAmount: number;
  settledAmount: number;
  rejectedAmount: number;
}

export const MerchantDashboard: React.FC<DashboardProps> = ({ navigation }) => {
  const [summary, setSummary] = useState<Summary>({
    pending: 0, settled: 0, rejected: 0,
    pendingAmount: 0, settledAmount: 0, rejectedAmount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summaryData, onboarding] = await Promise.all([
        getTransactionSummary(),
        getOnboardingStatus(),
      ]);
      setSummary(summaryData);
      setIsOnboarded(onboarding.isOnboarded);
      setMerchantId(onboarding.merchantId);
    } catch (err) {
      console.error('[Dashboard] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#818cf8"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>⬡ CryptiLink</Text>
          <Text style={styles.subtitle}>MERCHANT TERMINAL</Text>
          {merchantId && (
            <Text style={styles.merchantId}>{merchantId}</Text>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsContainer}>
          {/* Pending — Amber (NOT green!) */}
          <TouchableOpacity
            style={[styles.card, styles.cardPending]}
            onPress={() => navigation.navigate('TransactionHistory', { filter: 'OFFLINE_VERIFIED' })}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🕐</Text>
              <Text style={[styles.cardLabel, { color: '#f59e0b' }]}>
                PENDING SETTLEMENT
              </Text>
            </View>
            <Text style={[styles.cardAmount, { color: '#fbbf24' }]}>
              ₹{summary.pendingAmount.toFixed(2)}
            </Text>
            <Text style={styles.cardCount}>
              {summary.pending} transaction{summary.pending !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.cardWarning}>
              ⚠ Not yet confirmed by bank
            </Text>
          </TouchableOpacity>

          {/* Settled — Green (bank confirmed) */}
          <TouchableOpacity
            style={[styles.card, styles.cardSettled]}
            onPress={() => navigation.navigate('TransactionHistory', { filter: 'SETTLED' })}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>✅</Text>
              <Text style={[styles.cardLabel, { color: '#22c55e' }]}>
                SETTLED
              </Text>
            </View>
            <Text style={[styles.cardAmount, { color: '#4ade80' }]}>
              ₹{summary.settledAmount.toFixed(2)}
            </Text>
            <Text style={styles.cardCount}>
              {summary.settled} transaction{summary.settled !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.cardConfirmed}>
              ✓ Bank confirmed
            </Text>
          </TouchableOpacity>

          {/* Rejected — Red (bank rejected) */}
          {summary.rejected > 0 && (
            <TouchableOpacity
              style={[styles.card, styles.cardRejected]}
              onPress={() => navigation.navigate('TransactionHistory', { filter: 'SETTLEMENT_REJECTED' })}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>⚠️</Text>
                <Text style={[styles.cardLabel, { color: '#ef4444' }]}>
                  REJECTED
                </Text>
              </View>
              <Text style={[styles.cardAmount, { color: '#f87171' }]}>
                ₹{summary.rejectedAmount.toFixed(2)}
              </Text>
              <Text style={styles.cardCount}>
                {summary.rejected} transaction{summary.rejected !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.cardRejectedNote}>
                ✗ Bank rejected — review required
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={() => navigation.navigate('Listening')}
            activeOpacity={0.8}
          >
            <Text style={styles.listenButtonIcon}>📡</Text>
            <View>
              <Text style={styles.listenButtonTitle}>
                START LISTENING
              </Text>
              <Text style={styles.listenButtonSubtitle}>
                Receive transactions via SMS or acoustic
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('TransactionHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.historyButtonIcon}>📋</Text>
            <Text style={styles.historyButtonTitle}>Transaction History</Text>
          </TouchableOpacity>
        </View>

        {/* Security reminder */}
        <View style={styles.securityNote}>
          <Text style={styles.securityNoteIcon}>🔒</Text>
          <Text style={styles.securityNoteText}>
            Offline verification proves cryptographic authenticity only.
            A transaction marked "Pending Settlement" is NOT a guarantee
            of payment — the bank confirms during settlement.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    marginTop: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
    letterSpacing: 4,
    marginTop: 4,
  },
  merchantId: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  cardsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cardPending: {
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  cardSettled: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.2)',
  },
  cardRejected: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  cardCount: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardWarning: {
    fontSize: 11,
    color: '#fbbf24',
    marginTop: 8,
    fontStyle: 'italic',
  },
  cardConfirmed: {
    fontSize: 11,
    color: '#4ade80',
    marginTop: 8,
  },
  cardRejectedNote: {
    fontSize: 11,
    color: '#f87171',
    marginTop: 8,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  listenButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  listenButtonIcon: {
    fontSize: 28,
  },
  listenButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  listenButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  historyButton: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderColor: 'rgba(99,102,241,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyButtonIcon: {
    fontSize: 18,
  },
  historyButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#818cf8',
  },
  securityNote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.3)',
  },
  securityNoteIcon: {
    fontSize: 16,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
});

export default MerchantDashboard;
