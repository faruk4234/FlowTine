import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

const PRODUCTION = {
  ios: {
    banner: "ca-app-pub-6404362537453764/2727352259",
    interstitial: "ca-app-pub-6404362537453764/5896971309",
  },
  android: {
    banner: "ca-app-pub-6404362537453764/3771850930",
    interstitial: "ca-app-pub-6404362537453764/5164823655",
  },
} as const;

const platform = Platform.OS === "ios" ? "ios" : "android";
const prod = PRODUCTION[platform];

/** Google ad unit IDs. Uses test IDs in development builds. */
export const AD_UNIT_IDS = {
  banner: __DEV__ ? TestIds.BANNER : prod.banner,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : prod.interstitial,
};
