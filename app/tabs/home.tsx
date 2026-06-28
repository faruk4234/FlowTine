import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAtom, useAtomValue } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  userAtom,
  selectedGenreAtom,
  selectedVoiceAtom,
  selectedMoodAtom,
  promptOrLyricsTypeAtom,
  textInputAtom,
} from "@/src/state/atoms";
import { useAppTheme, Spacing, BorderRadius, Typography } from "@/src/state/theme";
import { apiService } from "@/src/services/api";

const { height } = Dimensions.get("window");

const GENRES = [
  { id: "house", label: "House", icon: "pulse" },
  { id: "pop", label: "Pop", icon: "musical-note" },
  { id: "rock", label: "Rock", icon: "flash" },
  { id: "hiphop", label: "Hip-Hop", icon: "mic" },
  { id: "electronic", label: "Electronic", icon: "sparkles" },
  { id: "lofi", label: "Lo-Fi", icon: "cafe" },
  { id: "jazz", label: "Jazz", icon: "color-palette" },
];

const VOICES = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "instrumental", label: "Instrumental" },
];

const MOODS = ["Energetic", "Chill", "Melancholy", "Happy", "Dark", "Dreamy", "Mysterious"];

export default function CreateScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [user, setUser] = useAtom(userAtom);
  const [selectedGenre, setSelectedGenre] = useAtom(selectedGenreAtom);
  const [selectedVoice, setSelectedVoice] = useAtom(selectedVoiceAtom);
  const [selectedMood, setSelectedMood] = useAtom(selectedMoodAtom);
  const promptType = useAtomValue(promptOrLyricsTypeAtom);
  const [textInput, setTextInput] = useAtom(textInputAtom);

  const [generating, setGenerating] = useState(false);
  const [activePicker, setActivePicker] = useState<"genre" | "voice" | "mood" | null>(null);

  // Set defaults on mount if empty
  React.useEffect(() => {
    if (!selectedGenre) setSelectedGenre("house");
    if (!selectedVoice) setSelectedVoice("female");
    if (!selectedMood) setSelectedMood("Energetic");
  }, [selectedGenre, selectedVoice, selectedMood, setSelectedGenre, setSelectedVoice, setSelectedMood]);

  const handleGenerate = async () => {
    if (!selectedGenre) {
      Alert.alert("Select Genre", "Please pick a musical genre first.");
      return;
    }
    if (!selectedVoice) {
      Alert.alert("Select Voice", "Please select a vocal or instrumental style.");
      return;
    }
    if (!textInput.trim()) {
      Alert.alert("Input Required", "Please write a prompt describing your song.");
      return;
    }

    const credits = user?.limits?.credit ?? 0;
    if (credits <= 0) {
      router.push("/paywall?type=credits");
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.generateMusic({
        genre: selectedGenre,
        voice: selectedVoice,
        prompt: textInput.trim(),
        type: promptType,
      });

      setUser(response.user);
      setTextInput("");

      Alert.alert(
        "Song Created!",
        `"${response.song.title}" is ready in your library.`,
        [
          {
            text: "Listen Now",
            onPress: () => {
              router.push("/tabs/library");
            },
          },
        ]
      );
    } catch (e) {
      console.error("Music generation failed:", e);
      Alert.alert("Generation Failed", "Could not build track. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const getGenreLabel = () => {
    const found = GENRES.find((g) => g.id === selectedGenre);
    return found ? found.label : "Select";
  };

  const getVoiceLabel = () => {
    const found = VOICES.find((v) => v.id === selectedVoice);
    return found ? found.label : "Select";
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Title */}
          <Text style={[s.headerTitle, { color: theme.colors.text }]}>Create Music</Text>

          {/* 1. Genre Row Selector */}
          <TouchableOpacity
            style={[s.rowCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => setActivePicker("genre")}
            activeOpacity={0.8}
          >
            <View style={s.rowLeft}>
              <Ionicons name="musical-notes" size={20} color={theme.colors.primary} />
              <Text style={[s.rowLabel, { color: theme.colors.text }]}>Genre</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={[s.rowValue, { color: theme.colors.primary }]}>{getGenreLabel()}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </View>
          </TouchableOpacity>

          {/* 2. Voice Row Selector */}
          <TouchableOpacity
            style={[s.rowCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => setActivePicker("voice")}
            activeOpacity={0.8}
          >
            <View style={s.rowLeft}>
              <Ionicons name="mic" size={20} color={theme.colors.primary} />
              <Text style={[s.rowLabel, { color: theme.colors.text }]}>Voice</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={[s.rowValue, { color: theme.colors.primary }]}>{getVoiceLabel()}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </View>
          </TouchableOpacity>

          {/* 3. Text Prompt Area Card */}
          <View style={[s.textCard, { backgroundColor: theme.colors.surface }]}>
            <View style={s.textCardHeader}>
              <TextInput
                style={[s.textInput, { color: theme.colors.text }]}
                placeholder="Enter prompt description..."
                placeholderTextColor={theme.colors.mutedText}
                multiline
                numberOfLines={6}
                value={textInput}
                onChangeText={setTextInput}
              />
              {textInput.length > 0 && (
                <TouchableOpacity
                  style={[s.clearBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                  onPress={() => setTextInput("")}
                >
                  <Ionicons name="close" size={14} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>

            {/* Inner progress loader */}
            {generating && (
              <View style={[s.innerLoader, { backgroundColor: theme.colors.surfaceElevated }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} style={s.spinner} />
                <Text style={[s.loaderText, { color: theme.colors.text }]}>Analyzing Your Text...</Text>
              </View>
            )}
          </View>

          {/* 4. Customize Row Selector */}
          <TouchableOpacity
            style={[s.rowCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => setActivePicker("mood")}
            activeOpacity={0.8}
          >
            <View style={s.rowLeft}>
              <Ionicons name="options-outline" size={20} color={theme.colors.text} />
              <Text style={[s.rowLabel, { color: theme.colors.text }]}>Customize</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={[s.rowValueMuted, { color: theme.colors.mutedText }]}>{selectedMood || "Select"}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedText} />
            </View>
          </TouchableOpacity>

          {/* 5. Big Pill Neon Green Button */}
          <TouchableOpacity
            style={[s.generateBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.9}
          >
            <Text style={s.generateBtnText}>Generate Song</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ──────── Pickers Bottom Sheets ──────── */}
        <Modal
          visible={activePicker !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActivePicker(null)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setActivePicker(null)}
          >
            <View style={[s.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.colors.text }]}>
                  {activePicker === "genre" && "Select Genre"}
                  {activePicker === "voice" && "Select Vocal Style"}
                  {activePicker === "mood" && "Select Vibe"}
                </Text>
                <TouchableOpacity onPress={() => setActivePicker(null)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.pickerList}>
                {activePicker === "genre" &&
                  GENRES.map((g) => {
                    const isSel = selectedGenre === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[s.pickerRow, isSel && { backgroundColor: theme.colors.surfaceElevated }]}
                        onPress={() => {
                          setSelectedGenre(g.id);
                          setActivePicker(null);
                        }}
                      >
                        <Ionicons name={g.icon as any} size={18} color={isSel ? theme.colors.primary : theme.colors.mutedText} />
                        <Text style={[s.pickerRowText, { color: theme.colors.text }, isSel && { color: theme.colors.primary, fontWeight: '700' }]}>
                          {g.label}
                        </Text>
                        {isSel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    );
                  })}

                {activePicker === "voice" &&
                  VOICES.map((v) => {
                    const isSel = selectedVoice === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[s.pickerRow, isSel && { backgroundColor: theme.colors.surfaceElevated }]}
                        onPress={() => {
                          setSelectedVoice(v.id as any);
                          setActivePicker(null);
                        }}
                      >
                        <Ionicons name={v.id === "instrumental" ? "musical-note" : "mic"} size={18} color={isSel ? theme.colors.primary : theme.colors.mutedText} />
                        <Text style={[s.pickerRowText, { color: theme.colors.text }, isSel && { color: theme.colors.primary, fontWeight: '700' }]}>
                          {v.label}
                        </Text>
                        {isSel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    );
                  })}

                {activePicker === "mood" &&
                  MOODS.map((m) => {
                    const isSel = selectedMood === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[s.pickerRow, isSel && { backgroundColor: theme.colors.surfaceElevated }]}
                        onPress={() => {
                          setSelectedMood(m);
                          setActivePicker(null);
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={18} color={isSel ? theme.colors.primary : theme.colors.mutedText} />
                        <Text style={[s.pickerRowText, { color: theme.colors.text }, isSel && { color: theme.colors.primary, fontWeight: '700' }]}>
                          {m}
                        </Text>
                        {isSel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: 120, // Pad for floating player
    gap: Spacing.md,
  },
  headerTitle: {
    ...Typography.hero,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  rowCard: {
    flexDirection: "row",
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowValueMuted: {
    fontSize: 15,
    fontWeight: "600",
  },
  textCard: {
    borderRadius: BorderRadius.md,
    padding: 16,
    minHeight: 180,
    justifyContent: "space-between",
  },
  textCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  innerLoader: {
    flexDirection: "row",
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  spinner: {
    marginRight: 2,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: "600",
  },
  generateBtn: {
    height: 58,
    borderRadius: BorderRadius.round,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    shadowColor: "#00FFA3",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#050D0A", // Bold black text
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: height * 0.6,
    padding: Spacing.md + 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  pickerList: {
    paddingBottom: Spacing.xl,
    gap: 4,
  },
  pickerRow: {
    flexDirection: "row",
    height: 48,
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    gap: 12,
  },
  pickerRowText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
