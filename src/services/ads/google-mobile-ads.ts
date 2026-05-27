type MobileAdsModule = typeof import("react-native-google-mobile-ads");

let initialized = false;
let modulePromise: Promise<MobileAdsModule | null> | null = null;

async function loadAdsModule(): Promise<MobileAdsModule | null> {
  if (!modulePromise) {
    modulePromise = import("react-native-google-mobile-ads")
      .then((mod) => mod)
      .catch(() => null);
  }
  return modulePromise;
}

/**
 * Google Mobile Ads is a native module — requires an EAS development build.
 * Returns false when the module is unavailable (e.g. Expo Go).
 */
export async function initializeGoogleMobileAds(): Promise<boolean> {
  if (initialized) return true;

  const mod = await loadAdsModule();
  if (!mod) return false;

  try {
    await mod.default().initialize();
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export function isGoogleMobileAdsInitialized(): boolean {
  return initialized;
}

export async function getAdsModule(): Promise<MobileAdsModule | null> {
  if (!initialized) {
    const ok = await initializeGoogleMobileAds();
    if (!ok) return null;
  }
  return loadAdsModule();
}
