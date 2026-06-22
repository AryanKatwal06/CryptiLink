import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './ErrorBoundary';

export const AppProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default AppProvider;
