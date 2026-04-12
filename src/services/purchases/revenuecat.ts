import { Platform } from 'react-native';

type RevenueCatConfig = {
  apiKeyApple?: string;
  apiKeyGoogle?: string;
  appUserId?: string | null;
};

let configured = false;

/**
 * RevenueCat requires a **development build** (or prebuild) because it’s a native module.
 * This helper is written to fail gracefully in Expo Go.
 */
export async function configureRevenueCat(cfg: RevenueCatConfig) {
  if (configured) return;

  const apiKey = (Platform.OS === 'ios' ? cfg.apiKeyApple : cfg.apiKeyGoogle) ?? '';
  if (!apiKey) return;

  try {
    // Import lazily so bundling still works if you later remove the dependency.
    const Purchases = (await import('react-native-purchases')).default;

    Purchases.configure({
      apiKey,
      appUserID: cfg.appUserId ?? undefined,
    });

    configured = true;
  } catch {
    // In Expo Go (or if the native module isn't linked), ignore.
  }
}

