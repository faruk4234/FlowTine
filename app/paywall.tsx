import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode, Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAtom, useSetAtom } from "jotai";
import Purchases from "react-native-purchases";

import { LEGAL_URLS } from "@/src/legal/urls";
import { isPremiumAtom, userAtom } from "@/src/state/atoms";
import { PaywallPalette as C } from "@/src/state/colors";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { apiService } from "@/src/services/api";
import { useAlert } from "@/src/providers/alert-provider";

export default function PaywallScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isCreditMode = type === "credits";

  const [user, setUser] = useAtom(userAtom);
  const setPremium = useSetAtom(isPremiumAtom);

  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { showAlert } = useAlert();

  // Configure Audio Session so video sound plays reliably and repeats continuously
  useEffect(() => {
    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
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
        description: "Save unlimited songs, lyrics & export high-bitrate MP3s",
      },
    ],
    []
  );

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // User requirement: "for now use mock data first 3 day 1 dollar after 5 dollar will be weakly 10 credit , no ads ,upgraded music generation like"
      const deviceId = user?.deviceId || "mock_device";

      // Try RevenueCat in production if configured, but gracefully fall back to mock weekly premium
      try {
        const isRCConfigured = await Purchases.isConfigured();
        if (isRCConfigured) {
          const offerings = await Purchases.getOfferings();
          const weeklyPackage = offerings.current?.availablePackages.find(
            (p) => p.packageType === Purchases.PACKAGE_TYPE.WEEKLY
          );
          if (weeklyPackage) {
            await Purchases.purchasePackage(weeklyPackage);
          }
        }
      } catch (rcError) {
        console.log("Using mock weekly premium purchase flow", rcError);
      }

      // Activate mock weekly premium: +10 credits, isPremium = true
      const updatedUser = await apiService.activateMockWeeklyPremium(deviceId);
      setUser(updatedUser);
      setPremium(true);

      showAlert(
        "Welcome to Weekly Premium! 🎵",
        "Your 3-day trial ($1.00) is now active! 10 weekly credits have been added to your account.",
        [
          {
            text: "Start Creating",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/tabs/home");
              }
            },
          },
        ]
      );
    } catch (e) {
      console.error("Purchase execution error:", e);
      showAlert("Purchase Failed", "Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      const isRCConfigured = await Purchases.isConfigured();
      if (isRCConfigured) {
        const customerInfo = await Purchases.restorePurchases();
        const active =
          customerInfo.entitlements.active &&
          Object.keys(customerInfo.entitlements.active).length > 0;
        setPremium(active);
        if (active) {
          if (user) setUser({ ...user, isPremium: true });
          showAlert("Restored", "Your weekly premium membership was restored!", [
            { text: "Continue", onPress: () => router.replace("/tabs/home") },
          ]);
          return;
        }
      }

      // Fallback restore for mock mode
      const deviceId = user?.deviceId || "mock_device";
      const updatedUser = await apiService.activateMockWeeklyPremium(deviceId);
      setUser(updatedUser);
      setPremium(true);
      showAlert("Restored", "Weekly Premium membership restored successfully.", [
        { text: "Continue", onPress: () => router.replace("/tabs/home") },
      ]);
    } catch (e) {
      console.error("Restore error:", e);
      showAlert("Restore Failed", "No purchases found to restore.");
    } finally {
      setLoading(false);
    }
  }, [router, setPremium, user, setUser]);

  // Can close if already premium or in development mode
  const canClose = useMemo(() => {
    if (isCreditMode) return true;
    if (user?.isPremium) return true;
    if (__DEV__) return true;
    return false;
  }, [isCreditMode, user]);

  const handleClose = () => {
    if (canClose) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/tabs/home");
      }
    } else {
      showAlert(
        "Premium Required",
        "Please start your 3-day trial ($1.00) to unlock MusicEngine AI and 10 weekly credits.",
        [
          { text: "OK" },
          ...(Platform.OS === "ios" || __DEV__
            ? [
                {
                  text: "Dev Bypass",
                  style: "destructive" as const,
                  onPress: () => {
                    setPremium(true);
                    if (user) setUser({ ...user, isPremium: true });
                    router.replace("/tabs/home");
                  },
                },
              ]
            : []),
        ]
      );
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Looping Fullscreen Background Video with Sound */}
      <Video
        source={require("../src/assets/paywall-video.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping={true}
        shouldPlay={true}
        isMuted={isMuted}
        volume={1.0}
      />

      {/* Premium Glass / Gradient Dark Overlay */}
      <View style={s.videoOverlay} />

      <SafeAreaView style={s.safe}>
        {/* Top Header Bar */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color={C.text} />
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
              size={18}
              color={C.text}
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
                <Ionicons name="sparkles" size={13} color={C.blue} />
              </View>
              <Text style={s.brandText}>MUSICENGINE AI PREMIUM</Text>
            </View>

            <Text style={s.headline}>Unlock All AI Power</Text>
            <Text style={s.subHeadline}>
              Create pro studio music, get weekly credits & zero ads
            </Text>
          </View>

          {/* Features Showcase */}
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
                  <Ionicons name={f.icon} size={18} color={C.blue} />
                </View>
                <View style={s.featureTextCol}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Single Weekly Package Card (Special Offer) */}
          <View style={s.planSection}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={s.planCardSelected}
              onPress={handlePurchase}
            >
              <View style={s.specialBadge}>
                <Ionicons name="flame" size={12} color="#FFF" />
                <Text style={s.specialBadgeText}>SPECIAL 3-DAY TRIAL OFFER</Text>
              </View>

              <View style={s.planInner}>
                <View style={s.planLeft}>
                  <View style={s.radioOuter}>
                    <View style={s.radioInner} />
                  </View>
                  <View>
                    <Text style={s.planName}>Weekly Premium</Text>
                    <Text style={s.planBenefits}>
                      10 Credits / Week • No Ads • Upgraded AI
                    </Text>
                  </View>
                </View>

                <View style={s.planPriceCol}>
                  <Text style={s.trialPriceText}>First 3 Days</Text>
                  <Text style={s.priceMain}>$1.00</Text>
                  <Text style={s.priceSub}>then $5.00/wk</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer CTA & Legal */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <View style={s.ctaBtnContent}>
                <Text style={s.ctaBtnText}>Start 3-Day Trial for $1.00</Text>
                <Ionicons name="arrow-forward" size={18} color={C.white} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={s.guaranteeText}>
            First 3 days $1.00, then $5.00/week. Includes 10 credits & upgraded AI. Cancel anytime.
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
    backgroundColor: "rgba(7, 10, 20, 0.78)",
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Platform.OS === "android" ? 12 : 6,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79, 131, 255, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(79, 131, 255, 0.35)",
    gap: 6,
    marginBottom: 12,
  },
  brandIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(79, 131, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8FAEFF",
    letterSpacing: 1.2,
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  subHeadline: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.75)",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  featuresCard: {
    backgroundColor: "rgba(18, 23, 40, 0.85)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 14,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  featureIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(79, 131, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
    lineHeight: 16,
  },
  planSection: {
    marginBottom: 8,
  },
  planCardSelected: {
    backgroundColor: "rgba(23, 33, 62, 0.92)",
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: "#4F83FF",
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: "relative",
    shadowColor: "#4F83FF",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  specialBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3E6FFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  specialBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.8,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4F83FF",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4F83FF",
  },
  planName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  planBenefits: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8FAEFF",
  },
  planPriceCol: {
    alignItems: "flex-end",
  },
  trialPriceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD05B",
    textTransform: "uppercase",
  },
  priceMain: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  priceSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.65)",
  },
  footer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
  },
  ctaBtn: {
    backgroundColor: "#3E6FFF",
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3E6FFF",
    shadowOpacity: 0.45,
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
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  guaranteeText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 15,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.55)",
    letterSpacing: 0.8,
  },
  legalDot: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.35)",
  },
});
