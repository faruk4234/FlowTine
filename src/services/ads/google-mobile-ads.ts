type GoogleAdsConfig = {
  /**
   * Use Google test id in dev:
   * - iOS: ca-app-pub-3940256099942544~1458002511
   * - Android: ca-app-pub-3940256099942544~3347511713
   */
  appId?: string;
};

let initialized = false;

/**
 * Google Mobile Ads is a **native module**.
 * In Expo Go it will not work; you need a development build.
 */
export async function initializeGoogleMobileAds(_cfg: GoogleAdsConfig = {}) {
  if (initialized) return;
  try {
    const mobileAds = (await import('react-native-google-mobile-ads')).default;
    await mobileAds().initialize();
    initialized = true;
  } catch {
    // Ignore in Expo Go / unlinked native module.
  }
}

