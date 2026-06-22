import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import Dashboard from '../screens/Dashboard';

import TransmissionScreen from '../screens/TransmissionScreen';

// Phase 4: Merchant-side screens
import MerchantDashboard from '../src/screens/merchant/MerchantDashboard';
import ListeningScreen from '../src/screens/merchant/ListeningScreen';
import VerificationScreen from '../src/screens/merchant/VerificationScreen';
import TransactionHistoryScreen from '../src/screens/merchant/TransactionHistoryScreen';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        {/* Consumer-side screens (Phase 2/3) */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={Dashboard} />
        <Stack.Screen name="Transmission" component={TransmissionScreen} />

        {/* Merchant-side screens (Phase 4) */}
        <Stack.Screen name="MerchantDashboard" component={MerchantDashboard} />
        <Stack.Screen name="Listening" component={ListeningScreen} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

