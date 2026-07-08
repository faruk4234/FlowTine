// Profile Screen - Collapsible Credits v2
import { ActionButton, Header } from "@/src/components";
import { LEGAL_URLS } from "@/src/legal/urls";
import { useAlert } from "@/src/providers/alert-provider";
import {
  isPremiumAtom,
  userAtom
} from "@/src/state/atoms";
import { AppPalette as C } from "@/src/state/colors";
import { BorderRadius, Spacing, useAppTheme } from "@/src/state/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAtom, useAtomValue } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Purchases from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";

const CREDIT_OPTIONS = [
  { songs: 1, price: "$2.00" },
  { songs: 5, price: "$7.00" },
  { songs: 10, price: "$10.00" },
];

export default function ProfileScreen() {
  const [showCreditDropdown, setShowCreditDropdown] = useState(false);
  const [selectedCreditIndex, setSelectedCreditIndex] = useState(0);

  const theme = useAppTheme();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [user, setUser] = useAtom(userAtom);
  const isPremium = useAtomValue(isPremiumAtom);

  const params = useLocalSearchParams<{ openCredits?: string; tab?: string }>();
  useEffect(() => {
    if (params?.openCredits === "true" || params?.tab === "credits") {
      setShowCreditDropdown(true);
    }
  }, [params?.openCredits, params?.tab]);

  const totalCredits = (user?.limits?.credit ?? 0) + (user?.limits?.premiumCredit ?? 0);

  const handleGoPremium = () => {
    router.navigate("/paywall");
  };

  const handleBuyCredits = () => {
    const selected = CREDIT_OPTIONS[selectedCreditIndex];
    showAlert(
      "Purchase Credits",
      `Buy ${selected.songs} song${selected.songs > 1 ? "s" : ""} for ${selected.price}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: () =>
            showAlert("Success", `Purchased ${selected.songs} song credit${selected.songs > 1 ? "s" : ""}!`),
        },
      ]
    );
  };

  const handleRestore = useCallback(async () => {
    try {
      const isRCConfigured = await Purchases.isConfigured();
      if (isRCConfigured) {
        const customerInfo = await Purchases.restorePurchases();
        const active = customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0;
        if (active) {
          if (user) setUser({ ...user, isPremium: true });
          showAlert("Restored", "Your premium membership has been restored!");
          return;
        }
      }

      // Fallback/Sim restore
      if (user) setUser({ ...user, isPremium: true });
      showAlert("Membership Active", "Membership restored (Developer Sim mode).");
    } catch (e) {
      console.error("Restore error:", e);
      showAlert("Restore Failed", "Could not restore purchase status.");
    }
  }, [user, setUser]);

  const handleSupport = () => {
    const body = `\n\n\n---\nPlatform: ${Platform.OS} ${Platform.Version}\nApp Version: 1.0.4`;
    const url = `mailto:support@cekolabs.com?subject=MusicEngine AI Support Request&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() =>
      showAlert("Support Email", "Please write to support@cekolabs.com for assistance.")
    );
  };

  const openLegalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open legal URL:", e);
    }
  }, []);



  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <Header title="Profile" />

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Subscription Tier Info Card */}
          <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.iconBg, { backgroundColor: isPremium ? "rgba(59, 130, 246, 0.15)" : theme.colors.surfaceElevated }]}>
                <Ionicons
                  name={isPremium ? "crown" : "star-outline"}
                  size={22}
                  color={isPremium ? theme.colors.primary : theme.colors.mutedText}
                />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardLabel, { color: theme.colors.text }]}>
                  {isPremium ? "Premium Membership" : "Free Plan"}
                </Text>
                <Text style={[s.cardSub, { color: theme.colors.mutedText }]}>
                  {isPremium ? "Unlimited AI song generation unlocked" : "Limited generation credits"}
                </Text>
              </View>
            </View>
            {!isPremium && (
              <ActionButton
                title="Upgrade to Pro"
                onPress={handleGoPremium}
                icon="star"
                style={{ maxHeight: 40 }}
              />
            )}
          </View>

          {/* Credits Card — Collapsible */}
          <View style={[s.creditCard, { backgroundColor: theme.colors.surface }]}>
            {/* Header row — always visible, tappable */}
            <TouchableOpacity
              style={s.creditHeaderRow}
              onPress={() => setShowCreditDropdown(!showCreditDropdown)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.creditTitle, { color: theme.colors.mutedText }]}>Credits</Text>
                <View style={s.creditCountRow}>
                  <View style={s.coinIcon}>
                    <Ionicons name="flash" size={16} color="#FFF" />
                  </View>
                  <Text style={[s.creditCount, { color: theme.colors.text }]}>
                    {totalCredits}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCreditDropdown(!showCreditDropdown)}>
                <Ionicons
                  name={showCreditDropdown ? "close" : "chevron-down"}
                  size={22}
                  color={theme.colors.mutedText}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Expanded: selectable options + Buy button */}
            {showCreditDropdown && (
              <View style={s.creditBody}>
                {CREDIT_OPTIONS.map((opt, idx) => {
                  const isSelected = idx === selectedCreditIndex;
                  return (
                    <TouchableOpacity
                      key={opt.songs}
                      style={[
                        s.creditOption,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          backgroundColor: isSelected
                            ? "rgba(59, 130, 246, 0.08)"
                            : "transparent",
                        },
                      ]}
                      onPress={() => setSelectedCreditIndex(idx)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.creditOptionLabel, { color: theme.colors.text }]}>
                        {opt.songs} song{opt.songs > 1 ? "s" : ""}
                      </Text>
                      <Text style={[s.creditOptionPrice, { color: theme.colors.text }]}>
                        {opt.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}


                <ActionButton
                  title="Buy"
                  style={{ maxHeight: 40 }}
                  onPress={handleBuyCredits}
                  icon="cart"
                />
              </View>
            )}
          </View>

          {/* Support & Legal Actions Section */}
          <Text style={[s.sectionTitle, { color: theme.colors.mutedText }]}>SUPPORT & LEGAL</Text>
          <View style={[s.optionsGroup, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity style={s.row} onPress={handleSupport} activeOpacity={0.7}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.text} style={s.rowIcon} />
              <Text style={[s.rowTitle, { color: theme.colors.text }, { flex: 1 }]}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity style={s.row} onPress={() => openLegalUrl(LEGAL_URLS.terms)} activeOpacity={0.7}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.text} style={s.rowIcon} />
              <Text style={[s.rowTitle, { color: theme.colors.text }, { flex: 1 }]}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity style={s.row} onPress={() => openLegalUrl(LEGAL_URLS.privacy)} activeOpacity={0.7}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.text} style={s.rowIcon} />
              <Text style={[s.rowTitle, { color: theme.colors.text }, { flex: 1 }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity style={s.row} onPress={handleRestore} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={20} color={theme.colors.text} style={s.rowIcon} />
              <Text style={[s.rowTitle, { color: theme.colors.text }, { flex: 1 }]}>Restore Purchases</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },

  /* ── Subscription Card ── */
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  primaryBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ── Credits Card ── */
  creditCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  creditHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  creditTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  creditCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
  },
  creditCount: {
    fontSize: 22,
    fontWeight: "700",
  },
  creditBody: {
    marginTop: 16,
    gap: 10,
  },
  creditOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  creditOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  creditOptionPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  buyBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  buyBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "700",
  },

  /* ── Settings rows ── */
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  optionsGroup: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 48,
  },
});
