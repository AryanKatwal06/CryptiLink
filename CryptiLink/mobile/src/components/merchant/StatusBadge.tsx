/**
 * CryptiLink Phase 4 — Status Badge Component
 *
 * Reusable badge that visually distinguishes the three transaction states.
 * This component enforces the visual separation that prevents the
 * OFFLINE_VERIFIED / SETTLED / SETTLEMENT_REJECTED conflation
 * that would create the liability gap from the security review.
 *
 * ═══════════════════════════════════════════════════════════════
 * VISUAL MAPPING (non-negotiable)
 * ═══════════════════════════════════════════════════════════════
 *
 *   OFFLINE_VERIFIED    → Amber badge, clock icon, "Pending Settlement"
 *   SETTLED             → Green badge, checkmark icon, "Confirmed"
 *   SETTLEMENT_REJECTED → Red badge, warning icon, "Rejected"
 *
 * These MUST be visually distinct at a glance. If they look similar,
 * the phase has failed its primary objective.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TransactionStatus } from '../../db/MerchantDatabase';

interface StatusBadgeProps {
  status: TransactionStatus;
  /** Optional rejection reason (shown for SETTLEMENT_REJECTED) */
  rejectionReason?: string | null;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show the full label text */
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<TransactionStatus, {
  icon: string;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  OFFLINE_VERIFIED: {
    icon: '🕐',
    label: 'Pending Settlement',
    shortLabel: 'Pending',
    color: '#f59e0b',         // Amber — NOT green
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  SETTLED: {
    icon: '✅',
    label: 'Confirmed',
    shortLabel: 'Confirmed',
    color: '#22c55e',         // Green — bank confirmed
    bgColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  SETTLEMENT_REJECTED: {
    icon: '⚠️',
    label: 'Rejected',
    shortLabel: 'Rejected',
    color: '#ef4444',         // Red — bank rejected
    bgColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  rejectionReason,
  size = 'medium',
  showLabel = true,
}) => {
  const config = STATUS_CONFIG[status];
  const sizeStyles = SIZE_MAP[size];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        paddingHorizontal: sizeStyles.paddingH,
        paddingVertical: sizeStyles.paddingV,
        borderRadius: sizeStyles.borderRadius,
      },
    ]}>
      <Text style={{ fontSize: sizeStyles.iconSize }}>{config.icon}</Text>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[
            styles.label,
            {
              color: config.color,
              fontSize: sizeStyles.fontSize,
              fontWeight: sizeStyles.fontWeight as '600' | '700' | '800',
            },
          ]}>
            {size === 'small' ? config.shortLabel : config.label}
          </Text>
          {status === 'SETTLEMENT_REJECTED' && rejectionReason && (
            <Text style={[styles.reasonText, { fontSize: sizeStyles.reasonFontSize }]}>
              {formatRejectionReason(rejectionReason)}
            </Text>
          )}
          {status === 'OFFLINE_VERIFIED' && size !== 'small' && (
            <Text style={[styles.warningText, { fontSize: sizeStyles.reasonFontSize }]}>
              Not yet confirmed by bank
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const SIZE_MAP = {
  small: {
    paddingH: 8,
    paddingV: 4,
    borderRadius: 6,
    iconSize: 12,
    fontSize: 11,
    fontWeight: '600',
    reasonFontSize: 9,
  },
  medium: {
    paddingH: 12,
    paddingV: 6,
    borderRadius: 8,
    iconSize: 16,
    fontSize: 13,
    fontWeight: '700',
    reasonFontSize: 11,
  },
  large: {
    paddingH: 16,
    paddingV: 10,
    borderRadius: 10,
    iconSize: 20,
    fontSize: 15,
    fontWeight: '800',
    reasonFontSize: 12,
  },
};

/**
 * Formats a rejection reason from the bank into human-readable text.
 */
function formatRejectionReason(reason: string): string {
  const REASON_MAP: Record<string, string> = {
    EXCEEDS_CUMULATIVE_EXPOSURE_CAP: 'Exceeded offline spending cap',
    EXCEEDS_PER_TX_CAP: 'Exceeded per-transaction limit',
    REPLAY_ATTACK_DETECTED: 'Duplicate transaction detected',
    CERTIFICATE_EXPIRED: 'Certificate expired',
    CERTIFICATE_REVOKED: 'Certificate revoked',
    CERTIFICATE_NOT_FOUND: 'Certificate not found',
    INVALID_SIGNATURE: 'Invalid signature',
    WALLET_NOT_FOUND: 'Wallet not found',
    WALLET_SUSPENDED: 'Wallet suspended',
  };
  return REASON_MAP[reason] || reason;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 6,
  },
  labelContainer: {
    flexShrink: 1,
  },
  label: {
    letterSpacing: 0.5,
  },
  reasonText: {
    color: '#f87171',
    marginTop: 2,
  },
  warningText: {
    color: '#fbbf24',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default StatusBadge;
