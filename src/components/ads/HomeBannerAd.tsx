import { AppPalette as C } from "@/src/state/colors";
import { Spacing } from "@/src/state/theme";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AD_UNIT_IDS } from "@/src/services/ads/ad-units";
import { getAdsModule } from "@/src/services/ads/google-mobile-ads";

type BannerModule = {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
  }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
};

export default function HomeBannerAd() {
  const [bannerMod, setBannerMod] = useState<BannerModule | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const mod = await getAdsModule();
      if (!cancelled && mod) {
        setBannerMod({
          BannerAd: mod.BannerAd as BannerModule["BannerAd"],
          BannerAdSize: mod.BannerAdSize as BannerModule["BannerAdSize"],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!bannerMod) return null;

  const { BannerAd, BannerAdSize } = bannerMod;

  return (
    <View style={s.container}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: C.surface,
    overflow: "hidden",
    alignItems: "center",
  },
});
