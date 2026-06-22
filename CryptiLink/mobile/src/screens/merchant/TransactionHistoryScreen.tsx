/**
 * CryptiLink Phase 4 — Transaction History Screen
 *
 * Displays all merchant transactions with clear three-state
 * differentiation:
 *
 *   OFFLINE_VERIFIED  — Amber badge, clock icon, "Pending Settlement"
 *   SETTLED           — Green badge, checkmark icon, "Confirmed"
 *   SETTLEMENT_REJECTED — Red badge, warning icon, "Rejected — [reason]"
 *
 * Rejected entries are PROMINENTLY surfaced, not buried in the list.
 * This is a requirement from the security review — a merchant needs
 * to know exactly which sale didn't actually clear.
 *
 * Filter tabs: All | Pending | Settled | Rejected
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {
  getAllTransactions,
  getTransactionsByStatus,
} from '../../db/TransactionLedger';
import StatusBadge from '../../components/merchant/StatusBadge';
import type { MerchantTransaction, TransactionStatus } from '../../db/MerchantDatabase';

type FilterTab = 'ALL' | TransactionStatus;

interface TransactionHistoryProps {
  navigation: {
    goBack: () => void;
  };
  route?: {
    params?: {
      filter?: TransactionStatus;
    };
  };
}

export const TransactionHistoryScreen: React.FC<TransactionHistoryProps> = ({
  navigation,
  route,
}) => {
  const initialFilter = route?.params?.filter || 'ALL';
  const [activeTab, setActiveTab] = useState<FilterTab>(initialFilter as FilterTab);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      if (activeTab === 'ALL') {
        setTransactions(await getAllTransactions());
      } else {
        setTransactions(await getTransactionsByStatus(activeTab));
      }
    } catch (err) {
      console.error('[TransactionHistory] Failed to load:', err);
    }
  }, [activeTab]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  const renderTransaction = useCallback(
    ({ item }: { item: MerchantTransaction }) => (
      <TransactionRow transaction={item} />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>TRANSACTION HISTORY</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
              activeTab === tab.key && { borderColor: tab.color },
            ]}
            onPress={() => setActiveTab(tab.key as FilterTab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && { color: tab.color },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction list */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#818cf8"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'ALL'
                ? 'Start listening to receive transactions'
                : `No ${activeTab.toLowerCase().replace('_', ' ')} transactions`}
            </Text>
          </View>
        }
      />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRANSACTION ROW COMPONENT
// ═══════════════════════════════════════════════════════════════

const TransactionRow: React.FC<{ transaction: MerchantTransaction }> = ({
  transaction: tx,
}) => {
  const timestamp = new Date(tx.receivedAt * 1000);
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <View style={[
      styles.txRow,
      tx.status === 'SETTLEMENT_REJECTED' && styles.txRowRejected,
    ]}>
      <View style={styles.txRowLeft}>
        {/* Channel indicator */}
        <View style={styles.channelBadge}>
          <Text style={styles.channelIcon}>
            {tx.channel === 'SMS' ? '📱' : '🔊'}
          </Text>
        </View>

        {/* Transaction details */}
        <View style={styles.txDetails}>
          <View style={styles.txTopRow}>
            <Text style={styles.txAmount}>₹{tx.amount.toFixed(2)}</Text>
            <StatusBadge
              status={tx.status}
              rejectionReason={tx.rejectionReason}
              size="small"
              showLabel={true}
            />
          </View>

          <View style={styles.txMetaRow}>
            <Text style={styles.txMeta}>
              {dateStr} {timeStr}
            </Text>
            <Text style={styles.txMeta}>•</Text>
            <Text style={styles.txMeta}>
              Seq #{tx.sequenceCounter}
            </Text>
            <Text style={styles.txMeta}>•</Text>
            <Text style={styles.txMeta}>
              {tx.walletIdHash.substring(0, 8)}…
            </Text>
          </View>

          {/* Rejection reason — prominently surfaced */}
          {tx.status === 'SETTLEMENT_REJECTED' && tx.rejectionReason && (
            <View style={styles.rejectionBanner}>
              <Text style={styles.rejectionIcon}>⚠️</Text>
              <Text style={styles.rejectionText}>
                {formatRejectionReason(tx.rejectionReason)}
              </Text>
            </View>
          )}

          {/* Settlement batch reference */}
          {tx.settlementBatchId && (
            <Text style={styles.batchRef}>
              Batch: {tx.settlementBatchId.substring(0, 8)}…
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { key: 'ALL', label: 'All', color: '#818cf8' },
  { key: 'OFFLINE_VERIFIED', label: 'Pending', color: '#f59e0b' },
  { key: 'SETTLED', label: 'Settled', color: '#22c55e' },
  { key: 'SETTLEMENT_REJECTED', label: 'Rejected', color: '#ef4444' },
];

function formatRejectionReason(reason: string): string {
  const map: Record<string, string> = {
    EXCEEDS_CUMULATIVE_EXPOSURE_CAP: 'Exceeded cumulative offline spending cap (₹500)',
    EXCEEDS_PER_TX_CAP: 'Exceeded per-transaction limit (₹200)',
    REPLAY_ATTACK_DETECTED: 'Duplicate transaction — already settled elsewhere',
    CERTIFICATE_EXPIRED: 'Consumer certificate expired',
    CERTIFICATE_REVOKED: 'Consumer certificate revoked by bank',
    CERTIFICATE_NOT_FOUND: 'Consumer certificate not found at bank',
    INVALID_SIGNATURE: 'Transaction signature invalid',
    WALLET_NOT_FOUND: 'Consumer wallet not found at bank',
    WALLET_SUSPENDED: 'Consumer wallet suspended',
  };
  return map[reason] || reason;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

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
    fontSize: 14,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.3)',
    backgroundColor: 'rgba(30,41,59,0.5)',
  },
  tabActive: {
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.2)',
    backgroundColor: 'rgba(30,41,59,0.3)',
  },
  txRowRejected: {
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  txRowLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  channelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIcon: {
    fontSize: 16,
  },
  txDetails: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  txMetaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  txMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  rejectionIcon: {
    fontSize: 14,
  },
  rejectionText: {
    flex: 1,
    fontSize: 11,
    color: '#f87171',
    fontWeight: '600',
  },
  batchRef: {
    fontSize: 10,
    color: '#475569',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
});

export default TransactionHistoryScreen;
