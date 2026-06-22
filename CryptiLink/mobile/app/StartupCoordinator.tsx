import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { RootNavigator } from '../navigation/RootNavigator';
import { ThemeProvider } from '../providers/ThemeProvider';
import { QueryProvider } from '../providers/QueryProvider';
import { StorageProvider } from '../providers/StorageProvider';
import { NotificationProvider } from '../providers/NotificationProvider';

export const StartupCoordinator: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      await new Promise((r) => setTimeout(r, 200));
      setReady(true);
    };
    run();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Starting CryptiLink...</Text>
      </View>
    );
  }

  return (
    <StorageProvider>
      <ThemeProvider>
        <QueryProvider>
          <NotificationProvider>
            <RootNavigator />
          </NotificationProvider>
        </QueryProvider>
      </ThemeProvider>
    </StorageProvider>
  );
};

export default StartupCoordinator;
