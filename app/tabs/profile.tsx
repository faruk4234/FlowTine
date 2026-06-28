import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAtom, useAtomValue } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Purchases from "react-native-purchases";

import {
  userAtom,
  isPremiumAtom,
  themeModeAtom,
} from "@/src/state/atoms";
import { AppPalette as C, type ThemeMode } from "@/src/state/colors";
import { useAppTheme, Spacing, BorderRadius, Typography } from "@/src/state/theme";
import { LEGAL_URLS } from "@/src/legal/urls";

export default function ProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [user, setUser] = useAtom(userAtom);
  const isPremium = useAtomValue(isPremiumAtom);
  const [themeMode, setThemeMode] = useAtom(themeModeAtom);

  const handleGoPremium = () => {
    router.push("/paywall");
  };

  const handleBuyCredits = () => {
    router.push("/paywall?type=credits");
  };

  const handleRestore = useCallback(async () => {
    try {
      const isRCConfigured = await Purchases.isConfigured();
      if (isRCConfigured) {
        const customerInfo = await Purchases.restorePurchases();
        const active = customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0;
        if (active) {
          if (user) setUser({ ...user, isPremium: true });
          Alert.alert("Restored", "Your premium membership has been restored!");
          return;
        }
      }
      
      // Fallback/Sim restore
      if (user) setUser({ ...user, isPremium: true });
      Alert.alert("Membership Active", "Membership restored (Developer Sim mode).");
    } catch (e) {
      console.error("Restore error:", e);
      Alert.alert("Restore Failed", "Could not restore purchase status.");
    }
  }, [user, setUser]);

  const handleSupport = () => {
    const body = `\n\n\n---\nPlatform: ${Platform.OS} ${Platform.Version}\nApp Version: 1.0.4`;
    const url = `mailto:support@cekolabs.com?subject=FlowTine Support Request&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Support Email", "Please write to support@cekolabs.com for assistance.")
    );
  };

  const openLegalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open legal URL:", e);
    }
  }, []);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    const nextIndex = (modes.indexOf(themeMode) + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        </View>

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
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleGoPremium}
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Credits Counter Card */}
          <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.iconBg, { backgroundColor: "rgba(249, 115, 22, 0.15)" }]}>
                <Ionicons name="flash" size={22} color="#F97316" />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardLabel, { color: theme.colors.text }]}>
                  {user?.limits?.credit ?? 0} Credits
                </Text>
                <Text style={[s.cardSub, { color: theme.colors.mutedText }]}>
                  Used for generating custom vocal soundtracks
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.secondaryBtn, { backgroundColor: theme.colors.surfaceElevated }]}
              onPress={handleBuyCredits}
              activeOpacity={0.85}
            >
              <Text style={[s.secondaryBtnText, { color: theme.colors.primary }]}>Buy Credits</Text>
            </TouchableOpacity>
          </View>

          {/* Theme Settings Section */}
          <Text style={[s.sectionTitle, { color: theme.colors.mutedText }]}>PREFERENCES</Text>
          <View style={[s.optionsGroup, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity style={s.row} onPress={cycleTheme} activeOpacity={0.7}>
              <Ionicons name="color-palette-outline" size={20} color={theme.colors.text} style={s.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: theme.colors.text }]}>App Theme</Text>
                <Text style={[s.rowValue, { color: theme.colors.primary }]}>
                  {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </TouchableOpacity>
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
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.hero,
    fontSize: 28,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },
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
  secondaryBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
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
