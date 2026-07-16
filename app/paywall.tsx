import { Ionicons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAtom, useSetAtom } from "jotai";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";

import { LEGAL_URLS } from "@/src/legal/urls";
import { useAlert } from "@/src/providers/alert-provider";
import { apiService } from "@/src/services/api";
import { isPremiumAtom, userAtom } from "@/src/state/atoms";
import { BorderRadius, Spacing } from "@/src/state/theme";

const getRevenueCatApiKey = () => {
  return Platform.OS === "ios"
    ? "appl_hkKhqhdofnFGxlkfTfNQGhuySjC"
    : "goog_dtzdNrZYFyqlpayZTlVPIXOiRTh";
};

export default function PaywallScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isCreditMode = type === "credits";

  const [user, setUser] = useAtom(userAtom);
  const setPremium = useSetAtom(isPremiumAtom);

  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<Video>(null);
  const { showAlert } = useAlert();

  const [packagePriceString, setPackagePriceString] = useState<string>("$4.99/week");
  const [introPriceString, setIntroPriceString] = useState<string>("$0.99");

  useEffect(() => {
    async function fetchRevenueCatOfferings() {
      try {
        let isRCConfigured = await Purchases.isConfigured();
        if (!isRCConfigured) {
          const apiKey = getRevenueCatApiKey();
          Purchases.configure({ apiKey, appUserID: user?.deviceId || undefined });
        }
        const offerings = await Purchases.getOfferings();
        console.log("📦 [Paywall] RevenueCat Offerings Packages:", JSON.stringify(offerings.current?.availablePackages, null, 2));

        const weeklyPackage =
          offerings.current?.weekly ||
          offerings.current?.availablePackages.find(
            (p) =>
              p.packageType === Purchases.PACKAGE_TYPE.WEEKLY ||
              p.identifier.toLowerCase().includes("week")
          ) ||
          offerings.current?.availablePackages[0];

        console.log("📦 [Paywall] Selected Weekly Package:", weeklyPackage?.identifier, weeklyPackage?.product?.priceString);

        if (weeklyPackage?.product) {
          const price = weeklyPackage.product.priceString;
          const introPrice = (weeklyPackage.product as any).introPrice?.priceString || "$0.99";
          if (price) setPackagePriceString(price);
          if (introPrice) setIntroPriceString(introPrice);
        }
      } catch (e) {
        console.warn("Could not fetch RevenueCat packages:", e);
      }
    }
    fetchRevenueCatOfferings();
  }, [user?.deviceId]);

  // Configure Audio Session so video sound plays reliably and repeats continuously
  useEffect(() => {
    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("Audio mode config error:", e);
      }
    }
    configureAudio();
  }, []);

  const openLegalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open legal URL:", e);
    }
  }, []);

  const features = useMemo(
    () => [
      {
        icon: "flash" as const,
        title: "10 Weekly AI Credits",
        description: "Refill 10 high-fidelity song credits every week",
      },
      {
        icon: "ban" as const,
        title: "No Advertisements",
        description: "Uninterrupted, zero-ad music creation studio",
      },
      {
        icon: "musical-notes" as const,
        title: "Upgraded Music Generation",
        description: "Access advanced AI audio models & extended track quality",
      },
      {
        icon: "cloud-download" as const,
        title: "Unlimited Audio & Lyrics",
        description: "Save unlimited songs, lyrics & export studio MP3s",
      },
    ],
    []
  );

  const handlePurchase = async () => {
    setLoading(true);
    try {
      let isRCConfigured = await Purchases.isConfigured();
      if (!isRCConfigured) {
        const apiKey = getRevenueCatApiKey();
        Purchases.configure({ apiKey, appUserID: user?.deviceId || undefined });
        isRCConfigured = true;
      }

      const offerings = await Purchases.getOfferings();
      const weeklyPackage =
        offerings.current?.weekly ||
        offerings.current?.availablePackages.find(
          (p) =>
            p.packageType === Purchases.PACKAGE_TYPE.WEEKLY ||
            p.identifier.toLowerCase().includes("week")
        ) ||
        offerings.current?.availablePackages[0];

      if (!weeklyPackage) {
        showAlert(
          "Real Purchase Unavailable",
          "No active products returned from RevenueCat. Please verify your App Store / Google Play products are configured."
        );
        return;
      }

      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(weeklyPackage);
      const sku = productIdentifier || weeklyPackage.product.identifier;

      let res;
      try {
        if (Platform.OS === "ios") {
          const activeEntitlements = customerInfo?.entitlements?.active || {};
          const firstEntitlement = Object.values(activeEntitlements)[0] as any;
          const transactionId =
            firstEntitlement?.originalPurchaseDate ||
            customerInfo?.originalAppUserId ||
            `${sku}_${Date.now()}`;

          res = await apiService.createSubscriptionPurchase({
            platform: "ios",
            transactionId: String(transactionId),
            sku,
          });
        } else {
          const activeEntitlements = customerInfo?.entitlements?.active || {};
          const firstEntitlement = Object.values(activeEntitlements)[0] as any;
          const purchaseToken =
            firstEntitlement?.originalPurchaseDate ||
            customerInfo?.originalAppUserId ||
            `${sku}_token`;

          res = await apiService.createSubscriptionPurchase({
            platform: "android",
            sku,
            packageName: Constants.expoConfig?.android?.package || "com.cekolabs.aimusic",
            purchaseToken: String(purchaseToken),
            transactionId: String(purchaseToken),
          });
        }
      } catch (backendErr: any) {
        console.warn("Backend createSubscriptionPurchase error:", backendErr);
        res = { success: false, error: backendErr?.message || "Server connection failed." };
      }

      if (res?.success === false || res?.error) {
        showAlert(
          "Verification Error",
          res?.error || "We could not verify your subscription with the server. Please try restoring or contact support."
        );
        return;
      }

      const refreshedUser = await apiService.getCurrentUser();
      if (refreshedUser && setUser) {
        setUser(refreshedUser);
      } else if (res?.user && setUser) {
        setUser(res.user);
      }

      showAlert(
        "Welcome to Weekly Premium! 🎵",
        "Your subscription is now active! 10 weekly credits have been added to your account.",
        [
          {
            text: "Start Creating",
            onPress: () => router.replace("/tabs/home"),
          },
        ]
      );
    } catch (rcError: any) {
      if (rcError?.userCancelled) {
        return;
      }
      console.error("RevenueCat real purchase error:", rcError);
      showAlert(
        "Purchase Failed",
        rcError?.message || "Could not complete real purchase. Please verify your billing account and network."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      let isRCConfigured = await Purchases.isConfigured();
      if (!isRCConfigured) {
        const apiKey = getRevenueCatApiKey();
        Purchases.configure({ apiKey, appUserID: user?.deviceId || undefined });
      }

      const customerInfo = await Purchases.restorePurchases();
      const active =
        (customerInfo.entitlements.active &&
          Object.keys(customerInfo.entitlements.active).length > 0) ||
        (customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0);

      if (active) {
        let res;
        try {
          const activeEntitlements = customerInfo?.entitlements?.active || {};
          const firstEntitlement = Object.values(activeEntitlements)[0] as any;
          const sku = firstEntitlement?.productIdentifier || "weekly_premium";

          if (Platform.OS === "ios") {
            const transactionId =
              firstEntitlement?.originalPurchaseDate ||
              customerInfo?.originalAppUserId ||
              `${sku}_restore`;

            res = await apiService.restoreSubscriptionPurchase({
              platform: "ios",
              transactionId: String(transactionId),
              sku,
            });
          } else {
            const purchaseToken =
              firstEntitlement?.originalPurchaseDate ||
              customerInfo?.originalAppUserId ||
              `${sku}_token`;

            res = await apiService.restoreSubscriptionPurchase({
              platform: "android",
              sku,
              packageName: Constants.expoConfig?.android?.package || "com.flowtine.app",
              purchaseToken: String(purchaseToken),
            });
          }
        } catch (backendErr: any) {
          console.warn("Backend restoreSubscriptionPurchase error:", backendErr);
          res = { success: false, error: backendErr?.message || "Server connection failed." };
        }

        if (res?.success === false || res?.error) {
          showAlert(
            "Restore Verification Error",
            res?.error || "We could not verify your restored subscription on the server."
          );
          return;
        }

        const refreshedUser = await apiService.getCurrentUser();
        if (refreshedUser && setUser) {
          setUser(refreshedUser);
        } else if (res?.user && setUser) {
          setUser(res.user);
        }

        showAlert("Restored", "Your weekly premium membership was restored!", [
          { text: "Continue", onPress: () => router.replace("/tabs/home") },
        ]);
      } else {
        showAlert("No Active Subscription", "No active real subscription was found on your App Store / Google Play account.");
      }
    } catch (e: any) {
      console.error("Restore error:", e);
      showAlert("Restore Failed", e?.message || "Could not restore real purchases.");
    } finally {
      setLoading(false);
    }
  }, [router, user, setUser, showAlert]);

  const canClose = useMemo(() => {
    if (isCreditMode) return true;
    if (user?.isPremium) return true;
    return false;
  }, [isCreditMode, user]);

  const handleClose = () => {
    router.replace('/tabs/home');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Looping Fullscreen Background Video with Sound */}
      <Video
        ref={videoRef}
        source={require("../src/assets/paywall-video.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping={true}
        shouldPlay={true}
        isMuted={isMuted}
        volume={1.0}
        onLoad={() => {
          videoRef.current?.playAsync();
        }}
      />

      {/* Deep Glass Dark Overlay */}
      <View style={s.videoOverlay} />

      <SafeAreaView style={s.safe}>
        {/* Top Bar Controls */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => setIsMuted((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle Sound"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={16}
              color="#00FFA3"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Brand & Headline */}
          <View style={s.headerSection}>
            <View style={s.brandRow}>
              <View style={s.brandIconBadge}>
                <Ionicons name="sparkles" size={11} color="#00FFA3" />
              </View>
              <Text style={s.brandText}>MUSICENGINE AI PREMIUM</Text>
            </View>

            <Text style={s.headline}>Unlock All Music Power</Text>
            <Text style={s.subHeadline}>
              Create pro studio music, get weekly credits & zero ads
            </Text>
          </View>

          {/* Compact Features Showcase */}
          <View style={s.featuresCard}>
            {features.map((f, idx) => (
              <View
                key={f.title}
                style={[
                  s.featureRow,
                  idx < features.length - 1 && s.featureRowBorder,
                ]}
              >
                <View style={s.featureIconCircle}>
                  <Ionicons name={f.icon} size={15} color="#00FFA3" />
                </View>
                <View style={s.featureTextCol}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.description}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={17} color="#22C55E" />
              </View>
            ))}
          </View>

          {/* Compact Weekly Package Card */}
          <View style={s.planSection}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={s.planCardSelected}
              onPress={handlePurchase}
            >
              <View style={s.specialBadge}>
                <Ionicons name="flame" size={11} color="#040814" />
                <Text style={s.specialBadgeText}>SPECIAL 7-DAY TRIAL OFFER</Text>
              </View>

              <View style={s.planInner}>
                <View style={s.planLeft}>
                  <View style={s.radioOuter}>
                    <View style={s.radioInner} />
                  </View>
                  <View>
                    <Text style={s.planName}>Weekly Premium</Text>
                    <Text style={s.planBenefits}>
                      10 Credits / Week
                    </Text>
                  </View>
                </View>

                <View style={s.planPriceCol}>
                  <Text style={s.trialPriceText}>First 1 Week</Text>
                  <Text style={s.priceMain}>{introPriceString}</Text>
                  <Text style={s.priceSub}>then {packagePriceString}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Compact Footer CTA Button (#00FFA3 solid glowing button without LinearGradient dependency) */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#040814" />
            ) : (
              <View style={s.ctaBtnContent}>
                <Ionicons name="sparkles" size={17} color="#040814" />
                <Text style={s.ctaBtnText}>Start 7-Day Trial for {introPriceString}</Text>
                <Ionicons name="arrow-forward" size={18} color="#040814" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={s.guaranteeText}>
            First 7 days {introPriceString}, then {packagePriceString}. Includes 10 credits & upgraded AI. Cancel anytime.
          </Text>

          <View style={s.legalRow}>
            <TouchableOpacity onPress={() => openLegalUrl(LEGAL_URLS.terms)}>
              <Text style={s.legalLink}>TERMS</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>•</Text>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={s.legalLink}>RESTORE</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>•</Text>
            <TouchableOpacity onPress={() => openLegalUrl(LEGAL_URLS.privacy)}>
              <Text style={s.legalLink}>PRIVACY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#05070E",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 16, 0.7)",
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 10,
    paddingBottom: 18,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 163, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 163, 0.38)",
    gap: 6,
    marginBottom: 10,
  },
  brandIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0, 255, 163, 0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00FFA3",
    letterSpacing: 1.1,
  },
  headline: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subHeadline: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.82)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  featuresCard: {
    backgroundColor: "rgba(14, 19, 33, 0.88)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 163, 0.24)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 12,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 255, 163, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 163, 0.32)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.68)",
    lineHeight: 15,
  },
  planSection: {
    marginBottom: 14,
  },
  planCardSelected: {
    backgroundColor: "rgba(16, 25, 43, 0.94)",
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: "#00FFA3",
    paddingTop: 22,
    paddingBottom: 15,
    paddingHorizontal: 16,
    position: "relative",
    shadowColor: "#00FFA3",
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  specialBadge: {
    position: "absolute",
    top: -11,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00CC82",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  specialBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#040814",
    letterSpacing: 0.7,
  },
  planInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#00FFA3",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00FFA3",
  },
  planName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  planBenefits: {
    fontSize: 11,
    fontWeight: "600",
    color: "#00FFA3",
  },
  planPriceCol: {
    alignItems: "flex-end",
  },
  trialPriceText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#00FFA3",
    textTransform: "uppercase",
  },
  priceMain: {
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  priceSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.65)",
  },
  footer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 14 : 10,
  },
  ctaBtn: {
    backgroundColor: "#00FFA3",
    borderRadius: BorderRadius.lg,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00FFA3",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 8,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#040814",
    letterSpacing: 0.2,
  },
  guaranteeText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 13,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  legalLink: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.55)",
    letterSpacing: 0.6,
  },
  legalDot: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.35)",
  },
});
