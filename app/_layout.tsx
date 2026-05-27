import Constants, { AppOwnership } from 'expo-constants';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import 'react-native-reanimated';

import { AdsProvider } from '@/src/providers/ads-provider';
import { AppThemeProvider } from '@/src/providers/app-theme-provider';
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

function msUntil(dateLike: unknown): number | null {
  if (!dateLike) return null;
  const d = dateLike instanceof Date ? dateLike : new Date(String(dateLike));
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return t - Date.now();
}

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

    let removeAppStateListener: (() => void) | undefined;

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
            // Logs: active subscriptions, offering/packages, and ms left on active entitlements.
            try {
              const activeEntitlements = info?.entitlements?.active ?? {};
              const entitlementKeys = Object.keys(activeEntitlements);
              const entitlementTimeLeftMs = entitlementKeys.map((k) => {
                const ent: any = (activeEntitlements as any)[k];
                return {
                  entitlement: k,
                  expiresMs: msUntil(ent?.expirationDate),
                  productId: ent?.productIdentifier ?? ent?.productId ?? null,
                };
              });

              const offerings = await Purchases.getOfferings();
              const current = offerings?.current;
              const packages =
                current?.availablePackages?.map((p: any) => ({
                  packageType: p?.packageType ?? null,
                  packageId: p?.identifier ?? p?.packageType ?? null,
                  productId: p?.product?.identifier ?? null,
                  productTitle: p?.product?.title ?? null,
                })) ?? [];


            } catch (e) {
              console.warn('[RevenueCat] debug log failed:', e);
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
          <AdsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="tabs" />
            <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'pageSheet' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="legal-webview" options={{ presentation: 'card' }} />
          </Stack>
          </AdsProvider>
        </AppThemeProvider>
      </JotaiProvider>
  );
}

export default RootLayout;