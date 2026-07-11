import Constants, { AppOwnership } from 'expo-constants';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import 'react-native-reanimated';

import { AppThemeProvider } from '@/src/providers/app-theme-provider';
import { AlertProvider } from '@/src/providers/alert-provider';
import { isPremiumAtom } from '@/src/state/atoms';
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

    let removeAppStateListener: (() => void) | undefined;

    try {
      const apiKey = Platform.OS === 'ios' ? PROD_KEYS.apple : PROD_KEYS.google;
      Purchases.configure({ apiKey });
    } catch (e) {
      console.warn("Purchases: Configuration failed:", e);
    }

    const setupPurchases = async () => {
      // Check if configured (especially important on Android if key is missing)
      const isConfigured = await Purchases.isConfigured();
      if (!isConfigured) {
        appStore.set(isPremiumAtom, false);
        return;
      }

      // 2. Fetch Customer Entitlements
      try {
        const refreshPremium = async () => {
          try {
            const info = await Purchases.getCustomerInfo();
            appStore.set(isPremiumAtom, isPremiumCustomer(info));

            // Debug logging on app open / foreground
            try {
              const offerings = await Purchases.getOfferings();
              console.log("📦 [RevenueCat Offerings Data]:", JSON.stringify(offerings.current?.availablePackages, null, 2));
            } catch (offErr) {
              console.warn("Could not log offerings:", offErr);
            }
          } catch (e) {
            // If we're offline (or any transient error), keep the last known premium state.
            // We'll update again next time the app becomes active / network is back.
            console.warn("Failed to fetch customer info (keeping cached isPremium):", e);
            appStore.set(isPremiumAtom, appStore.get(isPremiumAtom));
          }
        };

        // Initial refresh (cold start)
        await refreshPremium();

        // Listen for entitlement changes (purchase/renewal/cancel)
        Purchases.addCustomerInfoUpdateListener((info) => {
          appStore.set(isPremiumAtom, isPremiumCustomer(info));
        });

        // Refresh whenever app returns to foreground (important after external App Store flows)
        const sub = AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            void refreshPremium();
          }
        });
        removeAppStateListener = () => sub.remove();

      } catch (error) {
        console.error("Failed to fetch customer info:", error);
        appStore.set(isPremiumAtom, false);
      }
    };

    setupPurchases();

    return () => {
      removeAppStateListener?.();
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