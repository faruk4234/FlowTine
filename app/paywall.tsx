import { LEGAL_URLS } from "@/src/legal/urls";
import { isPremiumAtom } from "@/src/state/atoms";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSetAtom } from "jotai";
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
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg: "#070B12",
  surface: "#171A22",
  surfaceSoft: "#11151D",
  surfaceBtn: "#121722",
  text: "#F4F7FC",
  textMuted: "#A6AFBF",
  textDim: "#6F7A8C",
  blue: "#3B82F6",
  yellow: "#FACC15",
  border: "#242C38",
  borderSelected: "#3B82F6",
};

type PlanId = "free" | "weekly" | "monthly" | "yearly" | "lifetime";

type PlanRow = {
  id: PlanId;
  label: string;
  price: string;
  duration?: string;
  active?: boolean;
  badge?: string;
};

// Mapping labels and metadata for dynamic packages
const PACKAGE_METADATA: Record<string, { label: string; duration: string; badge?: string; order: number }> = {
  WEEKLY: { label: "Weekly", duration: "/ week", order: 1 },
  MONTHLY: { label: "Monthly", duration: "/ month", order: 2 },
  ANNUAL: { label: "Yearly", duration: "/ year", badge: "60% OFF", order: 3 },
  LIFETIME: { label: "Lifetime", duration: "one-time", order: 4 },
};

function pickPackageForPlan(
  packages: PurchasesPackage[],
  plan: PlanId,
): PurchasesPackage | undefined {
  const PT = Purchases.PACKAGE_TYPE;
  const typeByPlan: Record<PlanId, (typeof PT)[keyof typeof PT]> = {
    free: PT.UNKNOWN,
    weekly: PT.WEEKLY,
    monthly: PT.MONTHLY,
    yearly: PT.ANNUAL,
    lifetime: PT.LIFETIME,
  };
  const wanted = typeByPlan[plan];
  return packages.find((p) => p.packageType === wanted);
}

export default function PaywallScreen() {
  const router = useRouter();
  const setPremium = useSetAtom(isPremiumAtom);
  const [selectedId, setSelectedId] = useState<PlanId>("yearly");
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load real packages from RevenueCat
  const [offerings, setOfferings] = useState<any>(null);

  async function getOfferings() {
    try {
      // Guard: Wait for configuration to settle if necessary
      let retry = 0;
      while (!(await Purchases.isConfigured()) && retry < 10) {
        await new Promise(r => setTimeout(r, 500));
        retry++;
      }

      const isConfigured = await Purchases.isConfigured();
      console.log("📢 Purchases.isConfigured():", isConfigured);

      const res = await Purchases.getOfferings();
      const info = await Purchases.getCustomerInfo();
      
      console.log("📢 Raw Offerings Object:", JSON.stringify(res, null, 2));
      console.log("📢 Current Offering:", res.current);
      console.log("📢 Active Product IDs:", info.activeSubscriptions);
      console.log("📢 All Purchased IDs:", info.allPurchasedProductIdentifiers);

      if (res.current !== null && res.current.availablePackages.length !== 0) {
        console.log("📢 Found packages count:", res.current.availablePackages.length);
        setOfferings(res);
        setPackages(res.current.availablePackages);
      } else {
        console.warn("📢 No current offering or packages found in RevenueCat dashboard.");
      }
    } catch (e) {
      console.error("Paywall: Error loading data", e);
    } finally {
      setIsLoaded(true);
    }
  }

  React.useEffect(() => {
    getOfferings();
  }, []);

  // Map real package data to the UI rows
  const dynamicPlans = useMemo(() => {
    if (!isLoaded || packages.length === 0) return [];

    return packages
      .map(pkg => {
        const meta = PACKAGE_METADATA[pkg.packageType] || { label: pkg.product.title, duration: "", order: 99 };
        return {
          id: pkg.packageType as any,
          label: meta.label,
          price: pkg.product.priceString,
          duration: meta.duration,
          badge: meta.badge,
          pkg, // Actual package object
          order: meta.order,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [isLoaded, packages]);

  // Sync selectedId with Yearly if it just loaded
  React.useEffect(() => {
    if (dynamicPlans.length > 0 && selectedId === "yearly") {
      const exists = dynamicPlans.find(p => p.id === "ANNUAL");
      if (exists) setSelectedId("ANNUAL" as any);
      else if (dynamicPlans[0]) setSelectedId(dynamicPlans[0].id);
    }
  }, [dynamicPlans]);

  const openLegalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open legal URL:", e);
    }
  }, []);

  const handleUpgrade = async () => {
    const plan = dynamicPlans.find(p => p.id === selectedId);
    const pkg = plan?.pkg;

    if (!pkg) {
      Alert.alert("Package not found", "This plan is currently unavailable.");
      return;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (typeof customerInfo.entitlements.active["Premium Cats"] !== "undefined") {
        setPremium(true);
        router.push("/");
      }
    } catch (e) {
      console.log("📢 error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const active = typeof customerInfo.entitlements.active["Premium Cats"] !== "undefined";
      setPremium(active);
      if (active) {
        Alert.alert("Restored", "Your premium status has been restored!");
        router.push("/");
      } else {
        Alert.alert("No premium found", "We couldn't find an active subscription.");
      }
    } catch (e) {
      console.error("Restore error:", e);
    } finally {
      setLoading(false);
    }
  }, [router, setPremium]);

  const features = useMemo(
    () => [
      { icon: "infinite" as const, text: "Unlimited Routines" },
      { icon: "layers" as const, text: "Unlimited Movements" },
      { icon: "phone-portrait" as const, text: "Haptic Alerts" },
      { icon: "ban-outline" as const, text: "No Ads" },
    ],
    [],
  );

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
              onPress={() => router.back()}
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
                <Ionicons name="flash" size={13} color={C.blue} />
                <Text style={s.brandText}>FLOWTINE PREMIUM</Text>
              </View>

              <Text style={s.headline}>Flowtine</Text>
              <Text style={s.subHeadline}>Routine and Habit Tracker</Text>
            </View>

            <View style={s.featureGrid}>
              {features.map((f) => (
                <View key={f.text} style={s.featureCell}>
                  <View style={s.featureIconCircle}>
                    <Ionicons name={f.icon} size={15} color={C.blue} />
                  </View>
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>

            <View style={s.plans}>
              {dynamicPlans.map((plan) => {
                const selected = selectedId === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.85}
                    onPress={() => !plan.active && setSelectedId(plan.id)}
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
                        {plan.active ? (
                          <View style={s.activePill}>
                            <Text style={s.activeText}>ACTIVE</Text>
                          </View>
                        ) : (
                          <View style={s.priceBlock}>
                            <Text style={s.planPrice}>{plan.price}</Text>
                            {plan.duration ? (
                              <Text style={s.planDuration}>
                                {plan.duration}
                              </Text>
                            ) : null}
                          </View>
                        )}
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
              onPress={handleUpgrade}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.upgradeBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
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
  safe: { flex: 1, marginHorizontal: Spacing.sm },
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
    marginTop: Spacing.sm,
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
    fontSize: 22,
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    flexShrink: 1,
    numberOfLines: 1,
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
    color: "#111827",
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
    fontSize: 20,
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
    fontSize: 20,
    fontWeight: "600",
    color: C.textMuted,
  },
  planDuration: {
    fontSize: 14,
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
  activePill: {
    backgroundColor: "#40444A",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeText: {
    color: "#D1D5DB",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
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
    color: "#FFF",
    letterSpacing: 0.2,
  },
  restoreWrap: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "500",
    color: C.textMuted,
    textDecorationLine: "underline",
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
