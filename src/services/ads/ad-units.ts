import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

/** Foreground active time before an interstitial may show (45 minutes). */
export const INTERSTITIAL_FOREGROUND_INTERVAL_MS = 45 * 60 * 1000;

/** Minimum gap between interstitial displays. */
export const INTERSTITIAL_MIN_GAP_MS = 60 * 1000;

const PROD_BANNER = Platform.select({
  ios: "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx",
  android: "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx",
  default: TestIds.BANNER,
});

const PROD_INTERSTITIAL = Platform.select({
  ios: "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx",
  android: "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx",
  default: TestIds.INTERSTITIAL,
});

export const AD_UNIT_IDS = {
  banner: __DEV__ ? TestIds.BANNER : PROD_BANNER,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : PROD_INTERSTITIAL,
};
