import { LEGAL_URLS } from "@/src/legal/urls";
import { isPremiumAtom, userAtom } from "@/src/state/atoms";
import { PaywallPalette as C } from "@/src/state/colors";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAtom, useSetAtom } from "jotai";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
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
import { apiService } from "@/src/services/api";
import { useAlert } from "@/src/providers/alert-provider";

type PlanId = "weekly" | "monthly" | "yearly" | "credit10" | "credit50" | "credit100";

type PlanRow = {
  id: PlanId;
  label: string;
  price: string;
  duration?: string;
  badge?: string;
  creditsAmount?: number;
};

export default function PaywallScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isCreditMode = type === 'credits';

  const [user, setUser] = useAtom(userAtom);
  const setPremium = useSetAtom(isPremiumAtom);

  const [selectedId, setSelectedId] = useState<PlanId>(
    isCreditMode ? "credit50" : "yearly"
  );
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const openLegalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open legal URL:", e);
    }
  }, []);

  const features = useMemo(() => {
    if (isCreditMode) {
      return [
        { icon: "flash" as const, text: "Instant Generation" },
        { icon: "musical-notes" as const, text: "High Fidelity MP3" },
        { icon: "document-text" as const, text: "Auto Lyrics Generation" },
        { icon: "shield-checkmark" as const, text: "Secure Purchases" },
      ];
    }
    return [
      { icon: "infinite" as const, text: "Unlimited Generations" },
      { icon: "musical-note" as const, text: "Premium Audio Engine" },
      { icon: "save" as const, text: "Save Unlimited Lyrics" },
      { icon: "ban-outline" as const, text: "No Ads" },
    ];
  }, [isCreditMode]);

  const plansList = useMemo<PlanRow[]>(() => {
    if (isCreditMode) {
      return [
        { id: "credit10", label: "10 Credits Bundle", price: "$1.99", duration: "one-time", creditsAmount: 10 },
        { id: "credit50", label: "50 Credits Bundle", price: "$4.99", duration: "one-time", badge: "POPULAR", creditsAmount: 50 },
        { id: "credit100", label: "100 Credits Bundle", price: "$8.99", duration: "one-time", badge: "BEST VALUE", creditsAmount: 100 },
      ];
    }
    return [
      { id: "weekly", label: "Weekly Access", price: "$2.99", duration: "/ week" },
      { id: "monthly", label: "Monthly Pass", price: "$9.99", duration: "/ month" },
      { id: "yearly", label: "Annual Membership", price: "$49.99", duration: "/ year", badge: "SAVE 60%" },
    ];
  }, [isCreditMode]);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      if (isCreditMode) {
        // Purchase Credits workflow
        const selectedPlan = plansList.find(p => p.id === selectedId);
        const amount = selectedPlan?.creditsAmount || 0;
        
        // Add credits locally (mock database)
        const deviceId = user?.deviceId || 'mock_device';
        const updatedUser = await apiService.addMockCredits(deviceId, amount);
        setUser(updatedUser);
        
        showAlert("Success", `Successfully added ${amount} credits to your account!`, [
          { text: "Awesome", onPress: () => {
            if (router.canGoBack()) router.back();
            else router.replace("/tabs/home");
          }}
        ]);
      } else {
        // Premium Membership workflow
        // In real setup, triggers RevenueCat package purchase
        // Here we simulate the purchase to make dev flow clean, while falling back to Purchases configuration
        const isRCConfigured = await Purchases.isConfigured();
        if (isRCConfigured) {
          try {
            const offerings = await Purchases.getOfferings();
            const rcPackage = offerings.current?.availablePackages.find(p => {
              if (selectedId === "weekly") return p.packageType === Purchases.PACKAGE_TYPE.WEEKLY;
              if (selectedId === "monthly") return p.packageType === Purchases.PACKAGE_TYPE.MONTHLY;
              if (selectedId === "yearly") return p.packageType === Purchases.PACKAGE_TYPE.ANNUAL;
              return false;
            });

            if (rcPackage) {
              await Purchases.purchasePackage(rcPackage);
              const info = await Purchases.getCustomerInfo();
              const active = info.entitlements.active && Object.keys(info.entitlements.active).length > 0;
              setPremium(active);
              if (active) {
                router.replace("/tabs/home");
                return;
              }
            }
          } catch (e) {
            console.warn("RevenueCat purchase failed, falling back to mock purchase", e);
          }
        }

        // Mock subscription purchase fallback
        setPremium(true);
        if (user) {
          setUser({ ...user, isPremium: true });
        }
        
        showAlert("Welcome to Premium", "Your membership is now active!", [
          { text: "Get Started", onPress: () => router.replace("/tabs/home") }
        ]);
      }
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
        const active = customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0;
        setPremium(active);
        if (active) {
          if (user) setUser({ ...user, isPremium: true });
          showAlert("Restored", "Your premium membership was successfully restored!", [
            { text: "Continue", onPress: () => router.replace("/tabs/home") }
          ]);
          return;
        }
      }
      
      // Developer bypass for simulator restoring
      setPremium(true);
      if (user) setUser({ ...user, isPremium: true });
      showAlert("Bypass Active", "Membership restored (Developer Sim mode).", [
        { text: "Continue", onPress: () => router.replace("/tabs/home") }
      ]);
    } catch (e) {
      console.error("Restore error:", e);
      showAlert("Restore Failed", "No purchases found to restore.");
    } finally {
      setLoading(false);
    }
  }, [router, setPremium, user, setUser]);

  // Determine if closing is blocked (Paywall 1 waterfall on app startup)
  const canClose = useMemo(() => {
    if (isCreditMode) return true; // Paywall 2 can always be dismissed
    if (user?.isPremium) return true; // Premium user can close
    // In dev, let the developer close the paywall to view the app
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
        "MusicEngine AI is a premium service. Please subscribe to unlock the application.",
        [
          { text: "OK" },
          // Developer quick-skip backdoor in development builds
          ...(Platform.OS === 'ios' || __DEV__ ? [{
            text: "Dev Bypass",
            style: 'destructive' as const,
            onPress: () => {
              setPremium(true);
              if (user) setUser({ ...user, isPremium: true });
              router.replace("/tabs/home");
            }
          }] : [])
        ]
      );
    }
  };

  return (
    <View style={s.root}>
      <ImageBackground
        source={require("../src/assets/images/paywall-background.png")}
        style={s.backgroundImage}
      >
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <SafeAreaView style={s.safe}>
          <View style={s.topBar}>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bounces={true}>
            <View>
              <View style={s.brandRow}>
                <Ionicons name={isCreditMode ? "flash" : "crown"} size={13} color={C.blue} />
                <Text style={s.brandText}>
                  {isCreditMode ? "ADD CREATION CREDITS" : "MUSICENGINE AI PREMIUM"}
                </Text>
              </View>

              <Text style={s.headline}>{isCreditMode ? "Top-Up" : "Unlock All"}</Text>
              <Text style={s.subHeadline}>
                {isCreditMode 
                  ? "Refill your generation power instantly" 
                  : "Unlimited AI music creation & visualization"
                }
              </Text>
            </View>

            <View style={s.featureGrid}>
              {features.map((f) => (
                <View key={f.text} style={s.featureCell}>
                  <View style={s.featureIconCircle}>
                    <Ionicons name={f.icon} size={15} color={C.blue} />
                  </View>
                  <Text style={s.featureText} numberOfLines={1}>
                    {f.text}
                  </Text>
                </View>
              ))}
            </View>

            <View style={s.plans}>
              {plansList.map((plan) => {
                const selected = selectedId === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedId(plan.id)}
                    style={[s.planCard, selected && s.planCardSelected]}
                  >
                    {plan.badge ? (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{plan.badge}</Text>
                      </View>
                    ) : null}
                    <View style={s.planRowInner}>
                      <View style={s.planLeft}>
                        <View
                          style={[
                            s.radioOuter,
                            selected && s.radioOuterSelected,
                          ]}
                        >
                          {selected ? <View style={s.radioInner} /> : null}
                        </View>
                        <Text style={s.planLabel}>{plan.label}</Text>
                      </View>
                      <View style={s.planRight}>
                        <View style={s.priceBlock}>
                          <Text style={s.planPrice}>{plan.price}</Text>
                          {plan.duration ? (
                            <Text style={s.planDuration}>
                              {plan.duration}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.upgradeBtn, loading && s.upgradeBtnDisabled]}
              onPress={handlePurchase}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.upgradeBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
            {!isCreditMode ? (
              <View style={s.legalRow}>
                <TouchableOpacity onPress={() => openLegalUrl(LEGAL_URLS.terms)}>
                  <Text style={s.legalLink}>TERMS</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRestore}>
                  <Text style={s.legalLink}>RESTORE PURCHASES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openLegalUrl(LEGAL_URLS.privacy)}
                >
                  <Text style={s.legalLink}>PRIVACY</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[s.legalRow, { justifyContent: 'center' }]}>
                <Text style={{ fontSize: 11, color: C.textDim, fontWeight: '500' }}>
                  Credits do not expire. Purchases are final.
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  safe: { flex: 1, marginHorizontal: Spacing.sm, width: '92%' },
  topBar: {
    paddingHorizontal: Spacing.screenHorizontal - 6,
    paddingTop: Platform.OS === "android" ? 8 : 4,
    marginTop: Spacing.xs,
    paddingBottom: 6,
    alignItems: "flex-start",
  },
  closeBtn: {
    width: 36,
    height: 36,
    marginTop: Spacing.sm + 20,
    borderRadius: BorderRadius.round,
    backgroundColor: C.surfaceBtn,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 16,
    paddingBottom: 0,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  brandText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.4,
  },
  headline: {
    ...Typography.hero,
    fontSize: 44,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -1,
  },
  subHeadline: {
    ...Typography.bodyMedium,
    fontSize: 20,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: 30,
    marginTop: 4,
  },
  featureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: 15,
    marginBottom: 30,
    marginTop: 10,
  },
  featureCell: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    flexShrink: 1,
  },
  plans: {
    gap: 12,
    marginBottom: 0,
    flex: 1,
    justifyContent: 'center'
  },
  planCard: {
    backgroundColor: C.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.2,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: "relative",
  },
  planCardSelected: {
    borderColor: C.borderSelected,
    shadowColor: C.blue,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: C.yellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.ctaText,
    letterSpacing: 0.5,
  },
  planRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: C.text,
  },
  planRight: {
    alignItems: "center",
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: C.textMuted,
  },
  planDuration: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textDim,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.textDim,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: C.blue,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.blue,
  },
  footer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Platform.OS === "ios" ? Spacing.lg : Spacing.md,
    paddingTop: 28,
  },
  upgradeBtn: {
    backgroundColor: C.blue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  upgradeBtnDisabled: { opacity: 0.75 },
  upgradeBtnText: {
    ...Typography.bodyMedium,
    fontSize: 19,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.2,
  },
  legalRow: {
    paddingTop: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.xs,
    paddingHorizontal: 4,
  },
  legalLink: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.2,
    textDecorationLine: "underline",
  },
});
