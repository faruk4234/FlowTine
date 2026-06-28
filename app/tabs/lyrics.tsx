import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAtom } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  savedLyricsAtom,
  editingLyricAtom,
  type SavedLyrics,
} from "@/src/state/atoms";
import { useAppTheme, Spacing, BorderRadius } from "@/src/state/theme";
import { ActionButton, Header, SegmentedControl } from "@/src/components";

const INSPIRE_PROMPTS = [
  "Write an emotional pop ballad about letting go and moving forward.",
  "Create a high-energy rap verse about city lights and midnight driving.",
  "Write a moody indie rock song about long summer sunsets and memories.",
  "A dreamy electronic song about traveling through space and losing track of time.",
  "Write a warm acoustic song about drinking hot coffee on a rainy Sunday morning.",
];

const MOCK_LYRICS_GENERATIONS = [
  "Walking down the neon street, feeling the electric beat...\nThe stars align in the digital sky, and we watch the worlds go by.\nTime flows like a river in reverse,\nSinging our names in a cosmic verse.",
  "Ocean breeze and summer nights, under the fading gold lights...\nWe danced until the morning sun, two hearts beat as one.\nFootprints in the sand slowly disappear,\nBut the melody we hummed stays clear.",
  "Strumming strings of golden thread, thinking of the words you said...\nIn the silence of the night, everything will be alright.\nShadows on the wall move to the sound,\nAnd we realize what we lost is found.",
  "Deep bass thumping through the floor, we don't look back anymore...\nRising up into the vibe, feeling so damn alive.\nTurn the volume up and let it slide,\nNo more secrets left for us to hide."
];

export default function LyricsScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [savedLyrics, setSavedLyrics] = useAtom(savedLyricsAtom);
  const [editingLyric, setEditingLyric] = useAtom(editingLyricAtom);

  // Tab State: "prompt" = Use Prompt (AI), "manual" = Your Lyrics (Manual entry)
  const [activeSubTab, setActiveSubTab] = useState<"prompt" | "manual">("prompt");

  // Inputs state
  const [promptText, setPromptText] = useState("");
  const [manualText, setManualText] = useState("");
  const [lyricsTitle, setLyricsTitle] = useState("");
  const [generating, setGenerating] = useState(false);

  // Populate editor state if editing a lyric
  useEffect(() => {
    if (editingLyric) {
      setLyricsTitle(editingLyric.title);
      setManualText(editingLyric.content);
      setActiveSubTab("manual");
    }
  }, [editingLyric]);

  const handleInspire = () => {
    const randomPrompt = INSPIRE_PROMPTS[Math.floor(Math.random() * INSPIRE_PROMPTS.length)];
    setPromptText(randomPrompt);
  };

  const handleCancelEdit = () => {
    setEditingLyric(null);
    setLyricsTitle("");
    setManualText("");
    setPromptText("");
    Alert.alert("Edit Cancelled", "Discarded unsaved changes.");
    router.push("/tabs/library?tab=lyrics");
  };

  const handleCreateLyrics = async () => {
    const title = lyricsTitle.trim();
    if (!title) {
      Alert.alert("Title Required", "Please enter a title for your lyrics.");
      return;
    }

    if (editingLyric) {
      // Editing Mode
      const isManual = activeSubTab === "manual";
      const rawContent = isManual ? manualText.trim() : promptText.trim();
      
      if (!rawContent) {
        Alert.alert("Content Required", "Please write something first.");
        return;
      }

      let content = rawContent;

      if (!isManual) {
        setGenerating(true);
        Keyboard.dismiss();
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          content = MOCK_LYRICS_GENERATIONS[Math.floor(Math.random() * MOCK_LYRICS_GENERATIONS.length)];
        } catch (e) {
          console.error(e);
          Alert.alert("Generation Failed", "Could not rewrite lyrics.");
          setGenerating(false);
          return;
        } finally {
          setGenerating(false);
        }
      }

      const updated = savedLyrics.map((l) =>
        l.id === editingLyric.id
          ? { ...l, title, content, updatedAt: new Date().toLocaleDateString() }
          : l
      );

      setSavedLyrics(updated);
      setEditingLyric(null);
      setPromptText("");
      setManualText("");
      setLyricsTitle("");

      Alert.alert("Lyrics Saved", `"${title}" has been updated.`);
      router.push("/tabs/library?tab=lyrics");
      return;
    }

    // Creating Mode
    if (activeSubTab === "prompt") {
      if (!promptText.trim()) {
        Alert.alert("Prompt Required", "Please describe what your lyrics should be about.");
        return;
      }

      setGenerating(true);
      Keyboard.dismiss();

      try {
        // Simulate AI writing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const generatedContent = MOCK_LYRICS_GENERATIONS[Math.floor(Math.random() * MOCK_LYRICS_GENERATIONS.length)];

        const newLyric: SavedLyrics = {
          id: `lyric_${Date.now()}`,
          title,
          content: generatedContent,
          createdAt: new Date().toLocaleDateString(),
        };

        setSavedLyrics([newLyric, ...savedLyrics]);
        setPromptText("");
        setLyricsTitle("");

        Alert.alert("Lyrics Created!", `"${title}" has been saved to your library.`);
        router.push("/tabs/library?tab=lyrics");
      } catch (e) {
        console.error(e);
        Alert.alert("Generation Failed", "Could not create lyrics. Please try again.");
      } finally {
        setGenerating(false);
      }
    } else {
      // Manual Lyrics input mode
      if (!manualText.trim()) {
        Alert.alert("Lyrics Required", "Please type or paste your lyrics first.");
        return;
      }

      Keyboard.dismiss();

      const newLyric: SavedLyrics = {
        id: `lyric_${Date.now()}`,
        title,
        content: manualText.trim(),
        createdAt: new Date().toLocaleDateString(),
      };

      setSavedLyrics([newLyric, ...savedLyrics]);
      setManualText("");
      setLyricsTitle("");

      Alert.alert("Lyrics Saved!", `"${title}" has been added to your library.`);
      router.push("/tabs/library?tab=lyrics");
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <Header
          title={editingLyric ? "Edit Lyrics" : "Create Lyrics"}
          rightElement={
            editingLyric ? (
              <TouchableOpacity
                style={[s.cancelEditBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                onPress={handleCancelEdit}
              >
                <Text style={{ color: theme.colors.accent, fontWeight: "700", fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <SegmentedControl
            options={[
              { id: "prompt", label: "Use Prompt" },
              { id: "manual", label: "Your Lyrics" },
            ]}
            selectedId={activeSubTab}
            onSelect={(id) => setActiveSubTab(id as any)}
            height={48}
            style={{ marginBottom: Spacing.sm }}
          />

          {/* Input Cards Container */}
          <View style={s.tabContainer}>
            {activeSubTab === "prompt" ? (
              /* ─── USE PROMPT SUBTAB ─── */
              <View style={[s.textCard, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                  style={[s.textInput, { color: theme.colors.text }]}
                  placeholder="Enter prompt..."
                  placeholderTextColor={theme.colors.mutedText}
                  multiline
                  value={promptText}
                  onChangeText={setPromptText}
                />
                
                {/* Inspire Button at Bottom Left of card */}
                <View style={s.cardFooter}>
                  <TouchableOpacity
                    style={[s.pillBtn, { backgroundColor: theme.colors.surfaceElevated }]}
                    onPress={handleInspire}
                  >
                    <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
                    <Text style={[s.pillBtnText, { color: theme.colors.text }]}>Inspire</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ─── YOUR LYRICS SUBTAB (Manual lyrics writing) ─── */
              <View style={[s.textCard, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                  style={[s.textInput, { color: theme.colors.text }]}
                  placeholder="Type or paste your custom lyrics..."
                  placeholderTextColor={theme.colors.mutedText}
                  multiline
                  value={manualText}
                  onChangeText={setManualText}
                />
              </View>
            )}

            {/* Common Title input card */}
            <View style={[s.titleCard, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[s.titleInputText, { color: theme.colors.text }]}
                placeholder="Lyrics Title *"
                placeholderTextColor={theme.colors.mutedText}
                value={lyricsTitle}
                onChangeText={setLyricsTitle}
              />
            </View>

            {/* Reusable ActionButton */}
            <ActionButton
              title={editingLyric ? "Save Changes" : "Create Lyrics"}
              onPress={handleCreateLyrics}
              loading={generating}
              style={{ marginTop: Spacing.md }}
            />
          </View>
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
    paddingTop: Spacing.md,
    paddingBottom: 120, // Buffer space for floating player
    gap: Spacing.md,
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },

  tabContainer: {
    gap: Spacing.md,
  },
  textCard: {
    borderRadius: BorderRadius.md,
    padding: 16,
    minHeight: 280,
    justifyContent: "space-between",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 180,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 12,
  },
  pillBtn: {
    flexDirection: "row",
    height: 38,
    borderRadius: BorderRadius.round,
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 6,
  },
  pillBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  titleCard: {
    height: 58,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  titleInputText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
