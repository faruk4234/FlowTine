import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import Purchases from 'react-native-purchases';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AppThemeProvider } from '@/src/providers/app-theme-provider';
import { appStore } from '@/src/state/store';
import { isPremiumAtom } from '@/src/state/atoms';

// Ensure your RevenueCat API keys are placed here when you go live
const API_KEYS = {
  apple: "test_bInltzRNMclCwybpslqFMSNCvJE",
  google: "test_bInltzRNMclCwybpslqFMSNCvJE",
};

const RootLayout = () => {
  useEffect(() => {
    const setupPurchases = async () => {
      // 1. Initialize logic
      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: API_KEYS.apple });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: API_KEYS.google });
      }

      // 2. Fetch Customer Entitlements
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        
        // Will evaluate true if any generic subscription or IAP mapped via RevenueCat is active
        const hasActiveSubscription = Object.keys(customerInfo.entitlements.active).length > 0;
        
        // Push state dynamically into Jotai, decoupled from React component tree rendering
        appStore.set(isPremiumAtom, hasActiveSubscription);

        // Optional: Listen for active subscription changes automatically
        Purchases.addCustomerInfoUpdateListener((info) => {
          const isActive = Object.keys(info.entitlements.active).length > 0;
          appStore.set(isPremiumAtom, isActive);
        });

      } catch (error) {
        console.error("Failed to fetch customer info:", error);
      }
    };

    setupPurchases();
  }, []);

  return (
    <SafeAreaProvider>
      <JotaiProvider store={appStore}>
        <AppThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="tabs" />
            <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'card' }} />
            <Stack.Screen name="legal-webview" options={{ presentation: 'card' }} />
          </Stack>
        </AppThemeProvider>
      </JotaiProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;