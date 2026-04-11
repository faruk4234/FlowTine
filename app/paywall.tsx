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
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

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
  badge?: "62% OFF";
};

const PLANS: PlanRow[] = [
  { id: "weekly", label: "Weekly", price: "$4.99", duration: "/ week" },
  { id: "monthly", label: "Monthly", price: "$12.99", duration: "/ month" },
  {
    id: "yearly",
    label: "Yearly",
    price: "$59.99",
    duration: "/ year",
    badge: "62% OFF",
  },
  { id: "lifetime", label: "One-time payment", price: "$149.99" },
];

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
      if (selectedId === "free") {
        Alert.alert("Select a plan", "Choose a premium plan to continue.");
        return;
      }
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const packages = current?.availablePackages ?? [];
      if (packages.length === 0) {
        Alert.alert(
          "Store unavailable",
          "Subscription packages are not loaded yet. Check RevenueCat offerings and try again.",
        );
        return;
      }
      const pkg = pickPackageForPlan(packages, selectedId);
      if (!pkg) {
        Alert.alert(
          "Package not found",
          "No store package matches this plan. Map products in RevenueCat.",
        );
        return;
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = Object.keys(customerInfo.entitlements.active).length > 0;
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
        Alert.alert(
          "Purchase failed",
          "Something went wrong. Please try again.",
        );
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
        Alert.alert(
          "No purchases found",
          "There is nothing to restore for this account.",
        );
      }
    } catch (e) {
      console.error("Restore error:", e);
      Alert.alert(
        "Restore failed",
        "Could not restore purchases. Try again later.",
      );
    } finally {
      setLoading(false);
    }
  }, [router, setPremium]);

  const featureChips = useMemo(
    () => [
      { icon: "infinite" as const, label: "Unlimited Routines" },
      { icon: "ban-outline" as const, label: "No Ads" },
      { icon: "phone-portrait" as const, label: "Haptics" },
      { icon: "volume-high" as const, label: "Sounds" },
    ],
    [],
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

        <View style={s.content}>
          <View style={s.brandRow}>
            <Ionicons name="flash" size={13} color={C.blue} />
            <Text style={s.brandText}>FLOWTINE PREMIUM</Text>
          </View>

          <Text style={s.headline}>Flowtine</Text>
          <Text style={s.subHeadline}>Limitless focused sessions</Text>

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
                        style={[s.radioOuter, selected && s.radioOuterSelected]}
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
                            <Text style={s.planDuration}>{plan.duration}</Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
    paddingHorizontal: Spacing.screenHorizontal - 6,
    paddingTop: Platform.OS === "android" ? 8 : 4,
    paddingBottom: 6,
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    justifyContent: "center",
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
    fontSize: 30,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: Spacing.md,
    fontStyle: "italic",
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginHorizontal: 4,
  },
  featureChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
  },
  plans: {
    gap: 8,
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
    paddingTop: Spacing.sm,
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
