// Profile Screen - Collapsible Credits v2
import { ActionButton, Header } from "@/src/components";
import { LEGAL_URLS } from "@/src/legal/urls";
import { useAlert } from "@/src/providers/alert-provider";
import { apiService } from "@/src/services/api";
import {
  isPremiumAtom,
  userAtom
} from "@/src/state/atoms";
import { AppPalette as C } from "@/src/state/colors";
import { BorderRadius, Spacing, useAppTheme } from "@/src/state/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
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

const DEFAULT_CREDIT_OPTIONS = [
  { songs: 1, price: "$2.00" },
  { songs: 5, price: "$7.00" },
  { songs: 10, price: "$10.00" },
];

function getCreditCountFromPackage(pkg: any): number {
  const id = `${pkg?.identifier || ""} ${pkg?.product?.identifier || ""}`.toLowerCase();
  if (id.includes("10")) return 10;
  if (id.includes("5")) return 5;
  if (id.includes("1")) return 1;
  return 1;
}

const getRevenueCatApiKey = () => {
  return Platform.OS === "ios"
    ? "appl_hkKhqhdofnFGxlkfTfNQGhuySjC"
    : "goog_dtzdNrZYFyqlpayZTlVPIXOiRTh";
};

export default function ProfileScreen() {
  const [showCreditDropdown, setShowCreditDropdown] = useState(false);
  const [selectedCreditIndex, setSelectedCreditIndex] = useState(0);
  const [creditOptions, setCreditOptions] = useState(DEFAULT_CREDIT_OPTIONS);
  const [availableCreditItems, setAvailableCreditItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCreditOfferings() {
      try {
        let isRCConfigured = await Purchases.isConfigured();
        if (!isRCConfigured) {
          const apiKey = getRevenueCatApiKey();
          Purchases.configure({ apiKey });
          isRCConfigured = true;
        }

        const offerings = await Purchases.getOfferings();


        const allPackages: any[] = [];
        if (offerings.current?.availablePackages) {
          allPackages.push(...offerings.current.availablePackages);
        }
        if (offerings.all) {
          Object.values(offerings.all).forEach((off: any) => {
            if (off?.availablePackages) {
              off.availablePackages.forEach((pkg: any) => {
                if (!allPackages.some((ex) => ex.identifier === pkg.identifier)) {
                  allPackages.push(pkg);
                }
              });
            }
          });
        }

        let consumableItems: any[] = allPackages.filter(
          (p) =>
            p.packageType !== Purchases.PACKAGE_TYPE.WEEKLY &&
            !p.identifier.toLowerCase().includes("week") &&
            !p.product?.identifier?.toLowerCase().includes("week")
        );

        // Always query direct products to ensure credit1, credit5, credit10 are included
        const productIds =
          Platform.OS === "ios"
            ? ["1creidt", "5credit", "credit10", "credit 1", "credit 5", "credit 10"]
            : ["credit1", "credit5", "credit10", "credit 1", "credit 5", "credit 10"];
        try {
          const products = await Purchases.getProducts(
            productIds,
            Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION
          );
          products.forEach((prod) => {
            const alreadyExists = consumableItems.some(
              (item) =>
                item.product?.identifier === prod.identifier ||
                item.identifier === prod.identifier
            );
            if (!alreadyExists) {
              consumableItems.push({
                identifier: prod.identifier,
                product: prod,
                isDirectProduct: true,
              });
            }
          });
        } catch (prodErr) {
          console.warn("Could not fetch direct products:", prodErr);
        }

        consumableItems.sort((a, b) => getCreditCountFromPackage(a) - getCreditCountFromPackage(b));


        if (consumableItems.length > 0) {
          setAvailableCreditItems(consumableItems);
          const updated = consumableItems.map((rcItem) => {
            const songs = getCreditCountFromPackage(rcItem);
            return {
              songs,
              price: rcItem.product?.priceString || `$${songs}.00`,
            };
          });
          setCreditOptions(updated);
        }
      } catch (e) {
        console.warn("Could not fetch RevenueCat credit items:", e);
      }
    }
    fetchCreditOfferings();
  }, []);

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
    router.replace("/paywall");
  };

  const handleBuyCredits = async () => {
    const selected = creditOptions[selectedCreditIndex];
    try {
      const isRCConfigured = await Purchases.isConfigured();
      if (isRCConfigured) {
        let creditItem =
          availableCreditItems[selectedCreditIndex] ||
          availableCreditItems[0];

        const fallbackSkus = Platform.OS === "ios"
          ? ["1creidt", "5credit", "credit10"]
          : ["credit1", "credit5", "credit10"];
        const sku = creditItem?.product?.identifier || creditItem?.identifier || fallbackSkus[selectedCreditIndex] || "credit10";

        let purchaseRes;
        if (creditItem) {
          if (creditItem.isDirectProduct) {
            purchaseRes = await Purchases.purchaseStoreProduct(creditItem.product);
          } else {
            purchaseRes = await Purchases.purchasePackage(creditItem);
          }
        } else {
          const onDemandProducts = await Purchases.getProducts([sku], Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
          if (onDemandProducts && onDemandProducts.length > 0) {
            purchaseRes = await Purchases.purchaseStoreProduct(onDemandProducts[0]);
          } else {
            return;
          }
        }

        const { customerInfo, productIdentifier } = purchaseRes;
        const resolvedSku = productIdentifier || sku;

        const nonSubTransactions = customerInfo?.nonSubscriptionTransactions || [];
        const latestTransaction = nonSubTransactions.length > 0 ? nonSubTransactions[nonSubTransactions.length - 1] : null;
        const activeEntitlements = customerInfo?.entitlements?.active || {};
        const firstEntitlement = Object.values(activeEntitlements)[0] as any;

        const realToken =
          latestTransaction?.transactionIdentifier ||
          latestTransaction?.storeTransactionIdentifier ||
          (purchaseRes as any)?.transaction?.transactionIdentifier ||
          (purchaseRes as any)?.transaction?.purchaseToken ||
          firstEntitlement?.identifier ||
          customerInfo?.originalAppUserId ||
          `${resolvedSku}_token`;


        let res;
        if (Platform.OS === "ios") {
          res = await apiService.consumeOneTimeCredit({
            platform: "ios",
            sku: resolvedSku,
            transactionId: String(realToken),
          });
        } else {
          res = await apiService.consumeOneTimeCredit({
            platform: "android",
            sku: resolvedSku,
            packageName: Constants.expoConfig?.android?.package || "com.vybe.aimusic",
            purchaseToken: String(realToken),
          });
        }


        if (res?.success === false || res?.error) {
          showAlert(
            "Verification Error",
            res?.error || "We could not verify your credit purchase with the server."
          );
          return;
        }

        const updatedUser = res?.user || (res?._id || res?.deviceId ? res : null);
        if (updatedUser && setUser) {
          setUser(updatedUser);
        }
        showAlert("Purchased!", `Purchased ${selected.songs} song credit${selected.songs > 1 ? "s" : ""}!`);
      }
    } catch (rcError: any) {
      console.log("RevenueCat credits purchase cancelled or error:", rcError);
      if (!rcError?.userCancelled && !rcError?.message?.includes("cancelled")) {
        showAlert("Purchase Error", rcError?.message || "Could not complete purchase with Google/Apple.");
      }
    }
  };

  const handleRestore = useCallback(async () => {
    try {
      const isRCConfigured = await Purchases.isConfigured();
      if (isRCConfigured) {
        const customerInfo = await Purchases.restorePurchases();
        const active =
          (customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0) ||
          (customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0);
        if (active) {
          const activeEntitlements = customerInfo?.entitlements?.active || {};
          const firstEntitlement = Object.values(activeEntitlements)[0] as any;
          const sku = firstEntitlement?.productIdentifier || "weekly_premium";

          const nonSubTransactions = customerInfo?.nonSubscriptionTransactions || [];
          const latestTransaction = nonSubTransactions.length > 0 ? nonSubTransactions[nonSubTransactions.length - 1] : null;
          const realToken =
            latestTransaction?.transactionIdentifier ||
            firstEntitlement?.identifier ||
            customerInfo?.originalAppUserId ||
            `${sku}_restore`;

          let res;
          if (Platform.OS === "ios") {
            res = await apiService.restoreSubscriptionPurchase({
              platform: "ios",
              transactionId: String(realToken),
              sku,
            });
          } else {
            res = await apiService.restoreSubscriptionPurchase({
              platform: "android",
              sku,
              packageName: Constants.expoConfig?.android?.package || "com.cekolabs.aimusic",
              purchaseToken: String(realToken),
            });
          }

          if (res?.success === false || res?.error) {
            showAlert("Restore Verification Error", res?.error || "Could not verify restored subscription with server.");
            return;
          }

          const refreshedUser = await apiService.getMyProfile();
          if (refreshedUser && setUser) setUser(refreshedUser);
          showAlert("Restored", "Your premium membership has been restored!");
          return;
        }
      }

      showAlert("No Active Subscription", "No active real subscription was found on your App Store / Google Play account.");
    } catch (e) {
      console.error("Restore error:", e);
      showAlert("Restore Failed", "Could not restore purchase status.");
    }
  }, [user, setUser, showAlert]);

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
          {isPremium ? (
            <View style={s.vipCard}>
              <View style={s.vipHeader}>
                <View style={s.vipIconBadge}>
                  <MaterialCommunityIcons name="crown" size={26} color="#FFD700" />
                </View>
                <View style={s.cardText}>
                  <View style={s.vipTitleRow}>
                    <Text style={s.vipTitle}>MusicEngine Pro VIP</Text>
                    <View style={s.vipStatusPill}>
                      <MaterialCommunityIcons name="check-decagram" size={13} color="#00FFA3" />
                      <Text style={s.vipStatusText}>ACTIVE</Text>
                    </View>
                  </View>
                  <Text style={s.vipSubtitle}>
                    Unlimited Studio AI Generation & Weekly Credits Unlocked
                  </Text>
                </View>
              </View>

              <View style={s.vipPerksRow}>
                <View style={s.vipPerkItem}>
                  <Ionicons name="sparkles" size={13} color="#00FFA3" />
                  <Text style={s.vipPerkText}>Pro Audio Models</Text>
                </View>
                <View style={s.vipPerkItem}>
                  <Ionicons name="flash" size={13} color="#00FFA3" />
                  <Text style={s.vipPerkText}>No Ads & Studio Quality</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.freeCard}>
              <View style={s.vipHeader}>
                <View style={s.freeIconBadge}>
                  <MaterialCommunityIcons name="crown-outline" size={26} color="#00FFA3" />
                </View>
                <View style={s.cardText}>
                  <View style={s.vipTitleRow}>
                    <Text style={s.vipTitle}>MusicEngine Free</Text>
                    <View style={s.freeStatusPill}>
                      <Text style={s.freeStatusText}>FREE PLAN</Text>
                    </View>
                  </View>
                  <Text style={s.vipSubtitle}>
                    Upgrade to unlock unlimited weekly credits & studio audio features
                  </Text>
                </View>
              </View>

              <View style={s.vipPerksRow}>
                <View style={s.vipPerkItem}>
                  <Ionicons name="sparkles" size={13} color="#00FFA3" />
                  <Text style={s.freePerkText}>10 Weekly AI Credits</Text>
                </View>
                <View style={s.vipPerkItem}>
                  <Ionicons name="flash" size={13} color="#00FFA3" />
                  <Text style={s.freePerkText}>Pro Studio Engines</Text>
                </View>
              </View>

              <ActionButton
                title="Upgrade to Pro VIP"
                onPress={handleGoPremium}
                icon="star"
                style={{ height: 46, marginTop: 2 }}
              />
            </View>
          )}

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
                {creditOptions.map((opt, idx) => {
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
  vipCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: "#0B1D16",
    borderWidth: 1.5,
    borderColor: "rgba(0, 255, 163, 0.4)",
    gap: 14,
    shadowColor: "#00FFA3",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  vipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  vipIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  vipTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vipTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  vipStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 255, 163, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 163, 0.35)",
  },
  vipStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00FFA3",
    letterSpacing: 0.5,
  },
  vipSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A3C4B5",
    lineHeight: 16,
    marginTop: 2,
  },
  vipPerksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 255, 163, 0.15)",
    paddingTop: 12,
  },
  vipPerkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vipPerkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2FCEF",
  },

  freeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: "#111815",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 14,
  },
  freeIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 255, 163, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 255, 163, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  freeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  freeStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B4C5BE",
    letterSpacing: 0.5,
  },
  freePerkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#CFE3DA",
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
