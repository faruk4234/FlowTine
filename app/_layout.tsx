import Constants, { AppOwnership } from 'expo-constants';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/src/providers/app-theme-provider';
import { isPremiumAtom } from '@/src/state/atoms';
import { appStore } from '@/src/state/store';

// ─── RevenueCat Keys ──────────────────────────────────────────────────────────
// PROD KEYS: Only work in Development Builds (custom native app)
const PROD_KEYS = {
  apple: "appl_gJfpbUnvdEUPcDgIwJGaNOzQxxh",
  google: "goog_RokUOiUOpgCBAuJymemQyPnWTTH",
};

// TEST STORE KEY: Required for testing inside EXPO GO
const EXPO_GO_TEST_KEY = "test_QDKSTicRiuleHapXWJDzaMaHStn";

const RootLayout = () => {
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    try {
      // 1. Initialize logic
      if (isExpoGo) {
        // Use the Sandbox/Test Store key for Expo Go users
        Purchases.configure({ apiKey: EXPO_GO_TEST_KEY });
      } else {
        // Use real keys for production or development builds
        const apiKey = Platform.OS === 'ios' ? PROD_KEYS.apple : PROD_KEYS.google;
        Purchases.configure({ apiKey });
      }
    } catch (e) {
      console.warn("Purchases: Configuration failed (likely running in a simulator/web without native support)", e);
    }

    const setupPurchases = async () => {
      // Check if configured (especially important on Android if key is missing)
      const isConfigured = await Purchases.isConfigured();
      if (!isConfigured) return;

      // 2. Fetch Customer Entitlements
      try {
        const customerInfo = await Purchases.getCustomerInfo();

        // Check for specific entitlement 'Premium Cats'
        const hasActiveSubscription = typeof customerInfo.entitlements.active["Premium Cats"] !== "undefined";

        // Push state dynamically into Jotai
        appStore.set(isPremiumAtom, hasActiveSubscription);

        // Optional: Listen for active subscription changes automatically
        Purchases.addCustomerInfoUpdateListener((info) => {
          const isActive = typeof info.entitlements.active["Premium Cats"] !== "undefined";
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
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="legal-webview" options={{ presentation: 'card' }} />
          </Stack>
        </AppThemeProvider>
      </JotaiProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;