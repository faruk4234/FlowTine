import Constants, { AppOwnership } from 'expo-constants';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import 'react-native-reanimated';

import { AlertProvider } from '@/src/providers/alert-provider';
import { AppThemeProvider } from '@/src/providers/app-theme-provider';
import { appStore } from '@/src/state/store';

type CustomerInfoLike = {
  entitlements?: { active?: Record<string, unknown> };
  activeSubscriptions?: string[];
};

function isPremiumCustomer(info: CustomerInfoLike | null | undefined): boolean {
  const activeEntitlements = info?.entitlements?.active ?? {};
  if (activeEntitlements && Object.keys(activeEntitlements).length > 0) return true;
  const activeSubs = info?.activeSubscriptions ?? [];
  return Array.isArray(activeSubs) && activeSubs.length > 0;
}

// ─── RevenueCat Keys ──────────────────────────────────────────────────────────
// PROD KEYS: Only work in Development Builds (custom native app)
const PROD_KEYS = {
  apple: "appl_hkKhqhdofnFGxlkfTfNQGhuySjC",
  google: "goog_dtzdNrZYFyqlpayZTlVPIXOiRTh",
};

// TEST STORE KEY: Required for testing inside EXPO GO
const EXPO_GO_TEST_KEY = "test_bQaVOZuXDdOXFCJlyiWDikwxWPe";

const RootLayout = () => {
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
    }


    try {
      const apiKey = Platform.OS === 'ios' ? PROD_KEYS.apple : PROD_KEYS.google;
      Purchases.configure({ apiKey });
    } catch (e) {
      console.warn("Purchases: Configuration failed:", e);
    }


    return () => {
    };
  }, []);

  return (
    <JotaiProvider store={appStore}>
      <AppThemeProvider>
        <AlertProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="tabs" />
            <Stack.Screen name="music" />
            <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="legal-webview" options={{ presentation: 'card' }} />
          </Stack>
        </AlertProvider>
      </AppThemeProvider>
    </JotaiProvider>
  );
}

export default RootLayout;