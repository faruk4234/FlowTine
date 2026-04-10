import { LEGAL_URLS } from "@/src/legal/urls";
import { isPremiumAtom } from "@/src/state/atoms";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

const C = {
  bg: "#000000",
  surface: "#1C1C1E",
  surfaceBtn: "#2C2C2E",
  text: "#FFFFFF",
  textMuted: "#8E8E93",
  textDim: "#636366",
  blue: "#3B82F6",
  borderSelected: "#3B82F6",
};

type PlanId = "weekly" | "monthly" | "quarterly" | "annual" | "lifetime";

type PlanRow = {
  id: PlanId;
  label: string;
  price: string;
  duration?: string;
  badge?: "BEST VALUE";
};

const PLANS: PlanRow[] = [
  { id: "weekly", label: "WEEKLY", price: "$4.99", duration: "/wk" },
  { id: "monthly", label: "MONTHLY", price: "$12.99", duration: "/mo" },
  { id: "quarterly", label: "QUARTERLY", price: "$29.99", duration: "/3mo" },
  {
    id: "annual",
    label: "ANNUAL",
    price: "$49.99",
    duration: "/yr",
    badge: "BEST VALUE",
  },
  { id: "lifetime", label: "LIFETIME", price: "$99.99" },
];

function pickPackageForPlan(
  packages: PurchasesPackage[],
  plan: PlanId
): PurchasesPackage | undefined {
  const PT = Purchases.PACKAGE_TYPE;
  const typeByPlan: Record<PlanId, (typeof PT)[keyof typeof PT]> = {
    weekly: PT.WEEKLY,
    monthly: PT.MONTHLY,
    quarterly: PT.THREE_MONTH,
    annual: PT.ANNUAL,
    lifetime: PT.LIFETIME,
  };
  const wanted = typeByPlan[plan];
  return packages.find((p) => p.packageType === wanted);
}

export default function PaywallScreen() {
  const router = useRouter();
  const setPremium = useSetAtom(isPremiumAtom);
  const [selectedId, setSelectedId] = useState<PlanId>("annual");
  const [loading, setLoading] = useState(false);

  const openLegalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open legal URL:", e);
    }
  }, []);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const packages = current?.availablePackages ?? [];
      if (packages.length === 0) {
        Alert.alert(
          "Store unavailable",
          "Subscription packages are not loaded yet. Check RevenueCat offerings and try again."
        );
        return;
      }
      const pkg = pickPackageForPlan(packages, selectedId);
      if (!pkg) {
        Alert.alert(
          "Package not found",
          "No store package matches this plan. Map products in RevenueCat."
        );
        return;
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active =
        Object.keys(customerInfo.entitlements.active).length > 0;
      setPremium(active);
      if (active) router.back();
    } catch (e: unknown) {
      const cancelled =
        e &&
        typeof e === "object" &&
        "userCancelled" in e &&
        (e as { userCancelled?: boolean }).userCancelled === true;
      if (!cancelled) {
        console.error("Purchase error:", e);
        Alert.alert("Purchase failed", "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [router, selectedId, setPremium]);

  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const active = Object.keys(customerInfo.entitlements.active).length > 0;
      setPremium(active);
      if (active) {
        Alert.alert("Restored", "Your purchases were restored.");
        router.back();
      } else {
        Alert.alert("No purchases found", "There is nothing to restore for this account.");
      }
    } catch (e) {
      console.error("Restore error:", e);
      Alert.alert("Restore failed", "Could not restore purchases. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [router, setPremium]);

  const featureChips = useMemo(
    () => [
      { icon: "infinite" as const, label: "Unlimited" },
      { icon: "phone-portrait-outline" as const, label: "Adv. Haptics" },
      { icon: "ban-outline" as const, label: "No Ads" },
    ],
    []
  );

  return (
    <View style={s.root}>
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

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={s.brandRow}>
            <Ionicons name="flash" size={14} color={C.blue} />
            <Text style={s.brandText}>ROUTINEFLOW PREMIUM</Text>
          </View>

          <Text style={s.headline}>Upgrade to Premium</Text>

          <View style={s.featureRow}>
            {featureChips.map((f) => (
              <View key={f.label} style={s.featureChip}>
                <Ionicons name={f.icon} size={14} color="#93C5FD" />
                <Text style={s.featureChipText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.plans}>
            {PLANS.map((plan) => {
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
                    <Text style={s.planLabel}>{plan.label}</Text>
                    <View style={s.planRight}>
                      <View style={s.priceBlock}>
                        <Text style={s.planPrice}>{plan.price}</Text>
                        {plan.duration ? (
                          <Text style={s.planDuration}>{plan.duration}</Text>
                        ) : null}
                      </View>
                      <View
                        style={[s.radioOuter, selected && s.radioOuterSelected]}
                      >
                        {selected ? <View style={s.radioInner} /> : null}
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
            onPress={handleUpgrade}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.upgradeBtnText}>UPGRADE</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={loading}
            style={s.restoreWrap}
          >
            <Text style={s.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          <View style={s.legalRow}>
            <TouchableOpacity onPress={() => openLegalUrl(LEGAL_URLS.terms)}>
              <Text style={s.legalLink}>TERMS</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}> • </Text>
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
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.screenHorizontal - 4,
    paddingTop: Platform.OS === "android" ? 8 : 4,
    paddingBottom: 4,
    alignItems: "flex-start",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.round,
    backgroundColor: C.surfaceBtn,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: Spacing.md,
  },
  brandText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.8,
  },
  headline: {
    ...Typography.hero,
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: Spacing.lg,
    letterSpacing: -0.5,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#93C5FD",
  },
  plans: {
    gap: 12,
  },
  planCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
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
    top: -8,
    right: 12,
    backgroundColor: C.blue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  planRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: C.textMuted,
    letterSpacing: 1,
  },
  planRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
  },
  planDuration: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textMuted,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.textDim,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: C.blue,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.blue,
  },
  footer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Platform.OS === "ios" ? Spacing.lg : Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2C2C2E",
    backgroundColor: C.bg,
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
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 2,
  },
  restoreWrap: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: C.textMuted,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing.sm,
  },
  legalLink: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.2,
  },
  legalDot: {
    fontSize: 10,
    color: C.textMuted,
  },
});
