import { useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton, Header, InspireButton, SegmentedControl } from "@/src/components";
import {
  editingLyricAtom,
  libraryTabAtom,
  savedLyricsAtom,
  type SavedLyrics,
} from "@/src/state/atoms";
import { BorderRadius, Spacing, useAppTheme } from "@/src/state/theme";
import { useAlert } from "@/src/providers/alert-provider";

const ENTRANCE_PARTS = [
  "A sunrise over restless city streets.",
  "The first chord strikes at midnight.",
  "Opening notes echo in a quiet hallway.",
  "The drumbeat awakens the sleeping crowd.",
  "A gentle guitar strum greets the dawn.",
  "Electric synths pulse in the early fog.",
  "Vocal harmonies rise as the sun climbs.",
  "A thunderous bass drops as lights flicker.",
  "Soft piano chords linger in the air.",
  "A whispered chant begins the journey."
];

const MIDDLE_PARTS = [
  "Waves of sound cascade through the air.",
  "The chorus rises like a tide.",
  "Melodies intertwine, forming new colors.",
  "Rhythms accelerate, hearts start racing.",
  "Lyrics spin stories of love and loss.",
  "Synthesizers swirl in a neon haze.",
  "Guitars scream against the night sky.",
  "Bass drops shake the floor beneath.",
  "Vocals soar, reaching distant horizons.",
  "Percussion drives the pulse forward."
];

const LAST_PARTS = [
  "Fade out into quiet whispers.",
  "The final note lingers beyond the night.",
  "Echoes fade, leaving a gentle hush.",
  "A soft resolve brings calm to the storm.",
  "Silence settles, the song rests.",
  "The outro drifts like falling leaves.",
  "Closing chords close the story.",
  "Lights dim as the melody ends.",
  "A lingering chord fades into darkness.",
  "The final breath of music exhales peace."
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
  const { showAlert } = useAlert();

  const [savedLyrics, setSavedLyrics] = useAtom(savedLyricsAtom);
  const [editingLyric, setEditingLyric] = useAtom(editingLyricAtom);
  const setLibraryTab = useSetAtom(libraryTabAtom);

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
      if (editingLyric.type === "prompt") {
        setPromptText(editingLyric.content);
        setActiveSubTab("prompt");
      } else {
        setManualText(editingLyric.content);
        setActiveSubTab("manual");
      }
    }
  }, [editingLyric]);

  // Removed inline handleInspire; using InspireButton component instead

  const handleCancelEdit = () => {
    setEditingLyric(null);
    setLyricsTitle("");
    setManualText("");
    setPromptText("");
    showAlert("Edit Cancelled", "Discarded unsaved changes.");
    router.push("/tabs/library?tab=lyrics");
  };

  const handleCreateLyrics = async () => {
    const title = lyricsTitle.trim();
    if (!title) {
      showAlert("Title Required", "Please enter a title for your lyrics.");
      return;
    }

    if (editingLyric) {
      // Editing Mode
      const isManual = activeSubTab === "manual";
      const rawContent = isManual ? manualText.trim() : promptText.trim();

      if (!rawContent) {
        showAlert("Content Required", "Please write something first.");
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
          showAlert("Generation Failed", "Could not rewrite lyrics.");
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

      showAlert("Lyrics Saved", `"${title}" has been updated.`);
      const targetTab = editingLyric.type === "prompt" ? "prompts" : "lyrics";
      setLibraryTab(targetTab as any);
      router.push(`/tabs/library?tab=${targetTab}`);
      return;
    }

    // Creating Mode
    if (activeSubTab === "prompt") {
      if (!promptText.trim()) {
        showAlert("Prompt Required", "Please describe what your lyrics should be about.");
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
          type: "prompt",
        };

        setSavedLyrics([newLyric, ...savedLyrics]);
        setPromptText("");
        setLyricsTitle("");

        showAlert("Lyrics Created!", `"${title}" has been saved to your library.`);
        setLibraryTab("prompts");
        router.push("/tabs/library?tab=prompts");
      } catch (e) {
        console.error(e);
        showAlert("Generation Failed", "Could not create lyrics. Please try again.");
      } finally {
        setGenerating(false);
      }
    } else {
      // Manual Lyrics input mode
      if (!manualText.trim()) {
        showAlert("Lyrics Required", "Please type or paste your lyrics first.");
        return;
      }

      Keyboard.dismiss();

      const newLyric: SavedLyrics = {
        id: `lyric_${Date.now()}`,
        title,
        content: manualText.trim(),
        createdAt: new Date().toLocaleDateString(),
        type: "lyrics",
      };

      setSavedLyrics([newLyric, ...savedLyrics]);
      setManualText("");
      setLyricsTitle("");

      showAlert("Lyrics Saved!", `"${title}" has been added to your library.`);
      setLibraryTab("lyrics");
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
              { id: "prompt", label: "Use Prompt", icon: "pencil" },
              { id: "manual", label: "Your Lyrics", icon: "document-text" },
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
                <View style={s.textCardHeader}>
                  <TextInput
                    style={[s.textInput, { color: theme.colors.text }]}
                    placeholder="Enter prompt..."
                    placeholderTextColor={theme.colors.mutedText}
                    multiline
                    value={promptText}
                    onChangeText={setPromptText}
                  />
                  <View style={s.inspireBtnAbsolute}>
                    <InspireButton setPromptText={setPromptText} />
                  </View>
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
  textCardHeader: {
    position: 'relative',
    padding: 12,
  },
  inspireBtnAbsolute: {
    position: 'absolute',
    bottom: 12,
    left: 12,
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
