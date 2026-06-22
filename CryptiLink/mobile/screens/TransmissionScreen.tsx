import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Vibration, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { sendPayload, subscribeToChannelEvents } from '../services/CryptiLinkTransport';

type ChannelStatus = 'idle' | 'attempting' | 'success' | 'failed';

interface TransmissionRouteParams {
  amount?: number | string;
  merchantName?: string;
  signedPayload?: unknown;
}

const getChannelStateStyle = (status: ChannelStatus) => ({
  color:
    status === 'success' ? '#22c55e' :
    status === 'failed' ? '#ef4444' :
    status === 'attempting' ? '#5C6BC0' : '#444',
  fontFamily: 'JetBrains Mono',
  fontSize: 14,
});

export default function TransmissionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  const params = (route.params as TransmissionRouteParams | undefined) || {};
  const { amount, merchantName, signedPayload } = params;

  const [smsStatus, setSmsStatus] = useState<ChannelStatus>('idle');
  const [acousticStatus, setAcousticStatus] = useState<ChannelStatus>('idle');
  const [activeChannel, setActiveChannel] = useState<'sms' | 'acoustic' | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToChannelEvents((event: { channel: string; status: ChannelStatus }) => {
      if (event.channel === 'sms') {
        setSmsStatus(event.status);
        if (event.status === 'success') {
          Vibration.vibrate(50);
          setActiveChannel(null);
        } else if (event.status === 'failed') {
          startAcoustic();
        }
      } else if (event.channel === 'acoustic') {
        setAcousticStatus(event.status);
        if (event.status === 'success') {
          setActiveChannel(null);
        } else if (event.status === 'failed') {
          setActiveChannel(null);
          Vibration.vibrate([0, 50, 100, 50, 100, 50]);
        }
      }
    });

    startSms();

    return () => unsubscribe();
  }, []);

  const startSms = () => {
    setActiveChannel('sms');
    setSmsStatus('attempting');
    sendPayload('sms', signedPayload);
  };

  const startAcoustic = () => {
    setActiveChannel('acoustic');
    setAcousticStatus('attempting');
    
    setTimeout(() => {
      sendPayload('acoustic', signedPayload);
    }, 150);
  };

  const handleRetry = () => {
    setSmsStatus('idle');
    setAcousticStatus('idle');
    startSms();
  };

  const renderStatus = () => {
    if (smsStatus === 'success' || acousticStatus === 'success') {
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.pendingText}>Payment Sent</Text>
          <Text style={styles.pendingSubtitle}>Pending bank settlement</Text>
          <Text style={styles.dataText}>₹{amount}</Text>
          <Text style={styles.dataText}>to {merchantName}</Text>
        </View>
      );
    }

    if (smsStatus === 'failed' && acousticStatus === 'failed') {
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.errorText}>Not sent — hold locally and retry</Text>
          <Text style={styles.mutedText}>
            (Signed transaction is secured in local storage)
          </Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.label}>TRANSMITTING PAYLOAD...</Text>
        
        <View style={styles.channelRow}>
          <Text style={styles.channelName}>[1] SMS Channel:</Text>
          <Text style={getChannelStateStyle(smsStatus)}>{smsStatus.toUpperCase()}</Text>
        </View>

        <View style={styles.channelRow}>
          <Text style={styles.channelName}>[2] Acoustic Fallback:</Text>
          <Text style={getChannelStateStyle(acousticStatus)}>{acousticStatus.toUpperCase()}</Text>
        </View>

        {activeChannel === 'acoustic' && acousticStatus === 'attempting' && (
          <Text style={styles.acousticNotice}>
            Playing a sound to send your payment...
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderStatus()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 24,
    justifyContent: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    padding: 24,
    borderColor: '#5C6BC0',
    borderWidth: 1,
  },
  progressContainer: {
    padding: 24,
    borderColor: '#333',
    borderWidth: 1,
  },
  pendingText: {
    color: '#F59E0B', 
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  pendingSubtitle: {
    color: '#666',
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  mutedText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  dataText: {
    color: '#FFFFFF',
    fontFamily: 'JetBrains Mono',
    fontSize: 20,
    marginBottom: 8,
  },
  label: {
    color: '#5C6BC0',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 32,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  channelName: {
    color: '#AAA',
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
  },
  acousticNotice: {
    color: '#5C6BC0',
    marginTop: 32,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#111',
    borderColor: '#5C6BC0',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: '#5C6BC0',
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});