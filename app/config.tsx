import { isPremiumAtom, selectedMediaAtom } from "@/src/state/atoms";
import { AppPalette as C } from "@/src/state/colors";
import { BorderRadius, Spacing, Typography } from "@/src/state/theme";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Video } from "react-native-compressor";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdEventType, BannerAd, BannerAdSize, InterstitialAd, TestIds } from "react-native-google-mobile-ads";

type OperationMode = "compress" | "resize";
type CompressLevel = "small" | "medium" | "large" | "manual";
type AppStage = "config" | "processing" | "finished";
type FinishedItem = {
  originalAsset: ImagePicker.ImagePickerAsset;
  newUri: string;
  originalSize: number;
  newSize: number;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function ConfigScreen() {
  const router = useRouter();
  const [isPremium, setPremium] = useAtom(isPremiumAtom);
  const selectedMedia = useAtomValue(selectedMediaAtom);
  const setSelectedMedia = useSetAtom(selectedMediaAtom);

  const [stage, setStage] = useState<AppStage>("config");
  const [mode, setMode] = useState<OperationMode>("compress");
  const [compressLevel, setCompressLevel] = useState<CompressLevel>("medium");
  const [manualCompressScale, setManualCompressScale] = useState("50");
  
  // Resize states
  const [resizeWidth, setResizeWidth] = useState("1024");
  const [resizeHeight, setResizeHeight] = useState("1024");

  const [totalOriginalSize, setTotalOriginalSize] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [finishedItems, setFinishedItems] = useState<FinishedItem[]>([]);

  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const interstitial = React.useRef(
    InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    })
  ).current;

  useEffect(() => {
    if (isPremium) return;
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
    });
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitial.load();
    });
    interstitial.load();
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, [isPremium, interstitial]);

  useEffect(() => {
    if (selectedMedia.length === 0) {
      router.replace("/tabs/home");
      return;
    }
    const computeSizes = async () => {
      let total = 0;
      for (const item of selectedMedia) {
        if (item.fileSize) total += item.fileSize;
        else {
          const info = await FileSystem.getInfoAsync(item.uri);
          if (info.exists) total += info.size;
        }
      }
      setTotalOriginalSize(total);
    };
    computeSizes();
  }, [selectedMedia]);

  const getEstimatedSize = () => {
    if (mode === "resize") return totalOriginalSize * 0.4; // very rough estimate
    switch (compressLevel) {
      case "small": return totalOriginalSize * 0.15;
      case "medium": return totalOriginalSize * 0.4;
      case "large": return totalOriginalSize * 0.7;
      case "manual": {
        const val = parseInt(manualCompressScale, 10);
        return totalOriginalSize * (isNaN(val) ? 0.5 : Math.max(10, Math.min(100, val)) / 100);
      }
    }
  };

  const handleStart = async () => {
    if (!isPremium && interstitialLoaded) {
      try {
        interstitial.show();
      } catch (e) {
        console.log("Failed to show interstitial", e);
      }
    }

    setStage("processing");
    setLoadingMsg("Starting...");

    const results: FinishedItem[] = [];

    try {
      for (let i = 0; i < selectedMedia.length; i++) {
        const asset = selectedMedia[i];
        let newUri = "";
        
        let origSize = asset.fileSize || 0;
        if (!origSize) {
          const iO = await FileSystem.getInfoAsync(asset.uri);
          if (iO.exists) origSize = iO.size;
        }

        if (mode === "compress") {
          let factor = 0.5;
          if (compressLevel === "small") factor = 0.25;
          if (compressLevel === "large") factor = 0.75;
          if (compressLevel === "manual") {
            const val = parseInt(manualCompressScale, 10);
            factor = isNaN(val) ? 0.5 : Math.max(10, Math.min(100, val)) / 100;
          }

          if (asset.type === "video") {
            newUri = await Video.compress(
              asset.uri,
              { compressionMethod: "manual", bitrate: Math.max(500000, 10000000 * factor) },
              (progress) => setLoadingMsg(`Compressing Video ${i+1}/${selectedMedia.length}: ${Math.round(progress*100)}%`)
            );
          } else {
            setLoadingMsg(`Compressing Image ${i+1}/${selectedMedia.length}...`);
            const fallbackWidth = asset.width || 1024;
            const manip = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: Math.max(10, fallbackWidth * factor) } }],
              { compress: Math.max(0.1, factor) }
            );
            newUri = manip.uri;
          }
        } else {
          // RESIZE MODE
          if (asset.type === "video") {
            // Video Resize doesn't perfectly map to custom width/height in compressor easily. We use auto.
            setLoadingMsg(`Resizing Video ${i+1}/${selectedMedia.length}...`);
            newUri = await Video.compress(
              asset.uri,
              { compressionMethod: "auto" },
              (progress) => setLoadingMsg(`Processing Video ${i+1}/${selectedMedia.length}: ${Math.round(progress*100)}%`)
            );
          } else {
            setLoadingMsg(`Resizing Image ${i+1}/${selectedMedia.length}...`);
            const fallbackWidth = asset.width || 1024;
            const fallbackHeight = asset.height || 1024;
            const w = parseInt(resizeWidth, 10) || fallbackWidth;
            const h = parseInt(resizeHeight, 10) || fallbackHeight;
            const manip = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: w, height: h } }],
              { compress: 0.8 }
            );
            newUri = manip.uri;
          }
        }

        const iN = await FileSystem.getInfoAsync(newUri);
        const newSize = iN.exists ? iN.size : 0;

        results.push({ originalAsset: asset, newUri, originalSize: origSize, newSize });
      }

      setFinishedItems(results);
      setStage("finished");
    } catch (e: any) {
      console.error("Processing Error:", e);
      Alert.alert("Error", e?.message || "Processing failed.");
      setStage("config");
    }
  };

  const handleFinalize = async (replace: boolean) => {
    setStage("processing");
    setLoadingMsg(replace ? "Replacing originals..." : "Saving files...");
    try {
      for (const item of finishedItems) {
        await MediaLibrary.createAssetAsync(item.newUri);
        if (replace && item.originalAsset.assetId) {
          try { await MediaLibrary.deleteAssetsAsync([item.originalAsset.assetId]); } catch (e) {}
        }
      }
      const totalOrig = finishedItems.reduce((acc, curr) => acc + curr.originalSize, 0);
      const totalNew = finishedItems.reduce((acc, curr) => acc + curr.newSize, 0);
      const diff = totalOrig - totalNew;
      
      let msg = "";
      if (replace) msg = `You saved ${formatBytes(diff)} space!\n\nOriginal: ${formatBytes(totalOrig)}\nNew: ${formatBytes(totalNew)}`;
      else msg = `Added ${formatBytes(totalNew)} to gallery.\n\nOriginal: ${formatBytes(totalOrig)}\nNew: ${formatBytes(totalNew)}`;
      
      Alert.alert("Done!", msg);
      setSelectedMedia([]);
      router.replace("/tabs/home");
    } catch (e) {
      Alert.alert("Error", "Failed to save files.");
      setStage("finished");
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={s.topTitle}>Configure Setup</Text>
            <View style={{ width: 40 }} />
          </View>

          {stage === "config" && (
            <View>
              <View style={[s.card, { borderColor: C.blue, padding: Spacing.md }]}>
                <Text style={s.cardTitle}>{selectedMedia.length} File(s) Selected</Text>
                <Text style={s.subText}>Total Original Size: {formatBytes(totalOriginalSize)}</Text>
              </View>

              <View style={s.tabContainer}>
                <TouchableOpacity style={[s.tab, mode === "compress" && s.tabActive]} onPress={() => setMode("compress")}>
                  <Text style={[s.tabText, mode === "compress" && s.tabTextActive]}>Compress</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tab, mode === "resize" && s.tabActive]} onPress={() => setMode("resize")}>
                  <Text style={[s.tabText, mode === "resize" && s.tabTextActive]}>Resize Dimensions</Text>
                </TouchableOpacity>
              </View>

              <View style={s.configPanel}>
                {mode === "compress" ? (
                  <View>
                    <Text style={s.label}>Select Compression Level:</Text>
                    <View style={s.row}>
                      {(["small", "medium", "large", "manual"] as CompressLevel[]).map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[s.optBtn, compressLevel === level && s.optBtnActive]}
                          onPress={() => setCompressLevel(level)}
                        >
                          <Text style={[s.optBtnText, compressLevel === level && s.optBtnTextActive]}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {compressLevel === "manual" && (
                      <View style={s.manualContainer}>
                        <Text style={s.manualLabel}>Compression Scale (%):</Text>
                        <TextInput
                          style={s.manualInput}
                          keyboardType="number-pad"
                          value={manualCompressScale}
                          onChangeText={setManualCompressScale}
                          maxLength={3}
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={s.label}>Enter Custom Resolution:</Text>
                    <View style={s.resizeInputs}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.inputLabel}>Width (px)</Text>
                        <TextInput style={s.input} keyboardType="number-pad" value={resizeWidth} onChangeText={setResizeWidth} />
                      </View>
                      <Text style={{ marginHorizontal: 10, alignSelf: "center", fontSize: 20, color: C.textMuted }}>x</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.inputLabel}>Height (px)</Text>
                        <TextInput style={s.input} keyboardType="number-pad" value={resizeHeight} onChangeText={setResizeHeight} />
                      </View>
                    </View>
                    <Text style={[s.subText, { marginTop: 10, color: C.yellow }]}>Note: Exact video dimension resizing is limited. Works perfectly for images.</Text>
                  </View>
                )}

                <View style={s.estimateContainer}>
                  <Text style={s.estimateLabel}>Estimated Final Size:</Text>
                  <Text style={s.estimateValue}>~ {formatBytes(getEstimatedSize())}</Text>
                </View>
              </View>
            </View>
          )}

          {stage === "processing" && (
            <View style={s.card}>
              <ActivityIndicator size="large" color={C.blue} />
              <Text style={{ marginTop: 20, color: C.text, fontSize: 16, fontWeight: "600" }}>{loadingMsg}</Text>
              {!isPremium && <Text style={s.subText}>Watching ads while processing...</Text>}
            </View>
          )}

          {stage === "finished" && (
            <View>
              <View style={[s.card, { borderColor: C.green }]}>
                <Ionicons name="checkmark-circle" size={40} color={C.green} />
                <Text style={{ fontSize: 20, fontWeight: "700", color: C.green, marginTop: 10 }}>Completed!</Text>
                
                <View style={s.statsBox}>
                  <Text style={s.statsText}>Original: <Text style={{fontWeight: '700'}}>{formatBytes(finishedItems.reduce((a,c)=>a+c.originalSize,0))}</Text></Text>
                  <Text style={s.statsText}>New Size: <Text style={{fontWeight: '700', color: C.blue}}>{formatBytes(finishedItems.reduce((a,c)=>a+c.newSize,0))}</Text></Text>
                </View>
              </View>

              <View style={s.actions}>
                <Text style={s.label}>What would you like to do next?</Text>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.blue }]} onPress={() => handleFinalize(false)}>
                  <Text style={s.actionText}>Save as New Files</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.red, marginTop: 12 }]} onPress={() => handleFinalize(true)}>
                  <Text style={s.actionText}>Replace Original Files</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => { setSelectedMedia([]); router.replace("/tabs/home"); }}>
                  <Text style={{ color: C.textMuted, fontWeight: "600" }}>Cancel & Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
        
        {stage === "config" && (
          <View style={s.fixedFooter}>
            <TouchableOpacity style={s.startBtn} onPress={handleStart}>
              <Text style={s.startBtnText}>Start Processing</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPremium && (
          <View style={s.adContainer}>
            <BannerAd unitId={TestIds.BANNER} size={BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 10, paddingBottom: 84 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xl },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  topTitle: { fontSize: 20, fontWeight: "700", color: C.text },
  card: { backgroundColor: C.surface, padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: C.border, alignItems: "center" },
  cardTitle: { fontSize: 20, fontWeight: "700", color: C.text },
  subText: { fontSize: 13, color: C.textMuted, marginTop: 8, textAlign: "center" },
  tabContainer: { flexDirection: "row", marginTop: Spacing.lg, backgroundColor: C.surface, borderRadius: BorderRadius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: C.blue },
  tabText: { fontSize: 15, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: "#fff" },
  configPanel: { marginTop: Spacing.md, backgroundColor: C.surface, padding: Spacing.md, borderRadius: BorderRadius.lg },
  label: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: Spacing.sm },
  row: { flexDirection: "row", gap: Spacing.sm },
  optBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.bg, borderRadius: BorderRadius.md, alignItems: "center", borderWidth: 1, borderColor: C.border },
  optBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  optBtnText: { fontSize: 13, fontWeight: "600", color: C.text },
  optBtnTextActive: { color: "#fff" },
  manualContainer: { marginTop: Spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bg, padding: Spacing.sm, borderRadius: BorderRadius.md },
  manualLabel: { color: C.text, fontSize: 14, fontWeight: "600" },
  manualInput: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, width: 60, padding: 8, borderRadius: BorderRadius.md, textAlign: "center", fontSize: 16, fontWeight: "700" },
  resizeInputs: { flexDirection: "row" },
  inputLabel: { fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: "600" },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, color: C.text, padding: 12, borderRadius: BorderRadius.md, fontSize: 16, fontWeight: "700", textAlign: "center" },
  estimateContainer: { marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  estimateLabel: { color: C.textMuted, fontWeight: "600", fontSize: 14 },
  estimateValue: { color: C.blue, fontWeight: "800", fontSize: 16 },
  fixedFooter: { paddingHorizontal: Spacing.screenHorizontal, paddingTop: 12, paddingBottom: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  startBtn: { backgroundColor: C.blue, padding: 16, borderRadius: BorderRadius.md, alignItems: "center" },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  statsBox: { marginTop: Spacing.md, backgroundColor: C.bg, padding: Spacing.md, borderRadius: BorderRadius.md, width: "100%" },
  statsText: { fontSize: 15, color: C.textMuted, marginBottom: 4, textAlign: "center" },
  actions: { marginTop: Spacing.md, backgroundColor: C.surface, padding: Spacing.md, borderRadius: BorderRadius.lg },
  actionBtn: { padding: 16, borderRadius: BorderRadius.md, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  adContainer: { alignItems: "center", backgroundColor: C.bg, paddingBottom: Platform.OS === 'ios' ? 0 : 10 },
});
