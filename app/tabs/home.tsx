import { isPremiumAtom, selectedMediaAtom } from "@/src/state/atoms";
import { AppPalette as C } from "@/src/state/colors";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [isPremium, setPremium] = useAtom(isPremiumAtom);
  const setSelectedMedia = useSetAtom(selectedMediaAtom);

  const handlePickMedia = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "We need media library permissions to pick and save files.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: isPremium,
      selectionLimit: isPremium ? 1000 : 1,
      orderedSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      let items = result.assets;
      if (!isPremium && items.length > 1) {
        Alert.alert("Premium Feature", "Selecting multiple files is a premium feature.");
        items = [items[0]];
      }

      setSelectedMedia(items);
      router.push("/config");
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Minify{"\n"}Media</Text>
              <Text style={s.headerSub}>
                COMPRESS & RESIZE • {isPremium ? "PRO" : "FREE"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.xs }}>
              {!isPremium ? (
                <TouchableOpacity
                  style={[s.settingsBtn, { marginTop: 0, marginRight: Spacing.sm }]}
                  onPress={() => router.push("/paywall")} // Debug: Quick toggle to premium
                >
                  <MaterialCommunityIcons name="crown-outline" size={24} color={C.textMuted} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.settingsBtn, { marginTop: 0, marginRight: Spacing.sm, backgroundColor: C.blueDim }]}
                  disabled={isPremium}
                  onPress={() => setPremium(false)} // Debug: Quick toggle to free
                >
                  <MaterialCommunityIcons name="crown" size={24} color={C.blue} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.settingsBtn, { marginTop: 0 }]} onPress={() => router.push("../settings")}>
                <Ionicons name="settings-sharp" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* MAIN CONTENT AREA */}
          <View style={s.cardList}>
            <TouchableOpacity activeOpacity={0.7} style={s.createCard} onPress={handlePickMedia}>
              <View style={s.createIconWrap}>
                <Ionicons name="images-outline" size={32} color={C.blue} />
              </View>
              <Text style={s.createCardText}>Select Media to Minify</Text>
              {!isPremium && <Text style={s.subText}>Max 1 file per time (Pro for multi-select)</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* ADS FOR FREE USERS */}
        {!isPremium && (
          <View style={{ alignItems: "center", backgroundColor: C.bg, paddingBottom: Platform.OS === 'ios' ? 0 : 10 }}>
            <BannerAd unitId={TestIds.BANNER} size={BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: Platform.OS === "android" ? 48 : Spacing.md, paddingBottom: 84 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.xl },
  headerTitle: { ...Typography.hero, fontSize: 38, fontWeight: "800", color: C.text, lineHeight: 44, letterSpacing: -0.5 },
  headerSub: { ...Typography.caption, fontWeight: "700", color: C.textMuted, letterSpacing: 1.2, marginTop: Spacing.sm },
  settingsBtn: { width: 46, height: 46, borderRadius: BorderRadius.round, backgroundColor: C.surface, justifyContent: "center", alignItems: "center", marginTop: Spacing.xs },
  cardList: { gap: Spacing.md, marginBottom: 50 },
  createCard: { borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed", borderRadius: BorderRadius.lg, padding: Spacing.xl, justifyContent: "center", alignItems: "center", flexDirection: "column" },
  createIconWrap: { width: 45, height: 45, borderRadius: BorderRadius.md, backgroundColor: C.blueDim, justifyContent: "center", alignItems: "center" },
  createCardText: { fontSize: 20, fontWeight: "700", color: C.text, marginTop: Spacing.sm },
  subText: { fontSize: 13, color: C.textMuted, marginTop: 8 },
});
