import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAtom, useSetAtom } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  savedLyricsAtom,
  textInputAtom,
  promptOrLyricsTypeAtom,
  type SavedLyrics,
} from "@/src/state/atoms";
import { AppPalette as C } from "@/src/state/colors";
import { useAppTheme, Spacing, BorderRadius, Typography } from "@/src/state/theme";

export default function LyricsScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [savedLyrics, setSavedLyrics] = useAtom(savedLyricsAtom);
  const setTextInput = useSetAtom(textInputAtom);
  const setPromptType = useSetAtom(promptOrLyricsTypeAtom);

  const [editorVisible, setEditorVisible] = useState(false);
  const [lyricsTitle, setLyricsTitle] = useState("");
  const [lyricsContent, setLyricsContent] = useState("");

  const handleOpenAddLyrics = () => {
    setLyricsTitle("");
    setLyricsContent("");
    setEditorVisible(true);
  };

  const handleSaveLyrics = () => {
    if (!lyricsTitle.trim() || !lyricsContent.trim()) {
      Alert.alert("Required Fields", "Please specify both a title and lyrics content.");
      return;
    }

    const newLyric: SavedLyrics = {
      id: `lyric_${Date.now()}`,
      title: lyricsTitle.trim(),
      content: lyricsContent.trim(),
      createdAt: new Date().toLocaleDateString(),
    };
    setSavedLyrics([newLyric, ...savedLyrics]);
    setEditorVisible(false);
  };

  const handleEditTitle = (id: string, newTitle: string) => {
    const updated = savedLyrics.map((l) =>
      l.id === id ? { ...l, title: newTitle } : l
    );
    setSavedLyrics(updated);
  };

  const handleEditContent = (id: string, newContent: string) => {
    const updated = savedLyrics.map((l) =>
      l.id === id ? { ...l, content: newContent } : l
    );
    setSavedLyrics(updated);
  };

  const handleDeleteLyrics = (id: string) => {
    Alert.alert(
      "Delete Lyrics",
      "Are you sure you want to permanently delete this lyric?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const filtered = savedLyrics.filter((l) => l.id !== id);
            setSavedLyrics(filtered);
          },
        },
      ]
    );
  };

  const handleGenerateFromLyrics = (lyric: SavedLyrics) => {
    // Populate generator inputs
    setTextInput(lyric.content);
    setPromptType("lyrics");
    
    // Auto-navigate to home (Create tab)
    router.push("/tabs/home");
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: theme.colors.text }]}>Local Lyrics</Text>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleOpenAddLyrics}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#050D0A" />
            <Text style={[s.addBtnText, { color: "#050D0A" }]}>Add Lyric</Text>
          </TouchableOpacity>
        </View>

        {savedLyrics.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color={theme.colors.mutedText} />
            <Text style={[s.emptyText, { color: theme.colors.text }]}>No lyrics saved locally</Text>
            <Text style={[s.emptySubtext, { color: theme.colors.mutedText }]}>
              Create some custom lyrics that you can instantly turn into AI-generated music.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {savedLyrics.map((lyric) => (
              <View key={lyric.id} style={[s.lyricCard, { backgroundColor: theme.colors.surface }]}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[s.titleInputInline, { color: theme.colors.text }]}
                      value={lyric.title}
                      onChangeText={(val) => handleEditTitle(lyric.id, val)}
                      placeholder="Untitled Lyrics"
                      placeholderTextColor={theme.colors.mutedText}
                    />
                    <Text style={[s.cardDate, { color: theme.colors.mutedText }]}>
                      Created: {lyric.createdAt}
                    </Text>
                  </View>
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      onPress={() => handleDeleteLyrics(lyric.id)}
                      style={[s.iconButton, { backgroundColor: theme.colors.surfaceElevated }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput
                  style={[s.contentInputInline, { color: theme.colors.mutedText }]}
                  multiline
                  value={lyric.content}
                  onChangeText={(val) => handleEditContent(lyric.id, val)}
                  placeholder="Type lyrics here..."
                  placeholderTextColor={theme.colors.mutedText}
                />

                <TouchableOpacity
                  style={[s.generateBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleGenerateFromLyrics(lyric)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={14} color="#050D0A" />
                  <Text style={[s.generateBtnText, { color: "#050D0A" }]}>Generate Song from this Lyrics</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Create Editor Modal */}
        <Modal
          visible={editorVisible}
          animationType="slide"
          presentationStyle="overFullScreen"
          transparent={true}
        >
          <View style={s.modalContainer}>
            <View style={[s.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.colors.text }]}>New Lyrics</Text>
                <TouchableOpacity onPress={() => setEditorVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={[s.inputLabel, { color: theme.colors.text }]}>Title</Text>
                <TextInput
                  style={[s.titleInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                  placeholder="Enter lyrics title..."
                  placeholderTextColor={theme.colors.mutedText}
                  value={lyricsTitle}
                  onChangeText={setLyricsTitle}
                />

                <Text style={[s.inputLabel, { color: theme.colors.text }]}>Lyrics Content</Text>
                <TextInput
                  style={[s.lyricsInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceElevated }]}
                  placeholder="Paste or write your custom lyrics..."
                  placeholderTextColor={theme.colors.mutedText}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  value={lyricsContent}
                  onChangeText={setLyricsContent}
                />
              </ScrollView>

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveLyrics}
                activeOpacity={0.85}
              >
                <Text style={[s.saveBtnText, { color: "#050D0A" }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.hero,
    fontSize: 28,
    fontWeight: "800",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: 120, // Buffer space for persistent bottom audio player
    gap: Spacing.md,
  },
  lyricCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    shadowColor: C.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  titleInputInline: {
    fontSize: 16,
    fontWeight: "700",
    padding: 0,
    margin: 0,
  },
  cardDate: {
    fontSize: 11,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  contentInputInline: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
    padding: 0,
    textAlignVertical: "top",
  },
  generateBtn: {
    flexDirection: "row",
    height: 46,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    height: "75%",
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
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
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  titleInput: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 6,
    fontWeight: "600",
  },
  lyricsInput: {
    fontSize: 14,
    borderRadius: BorderRadius.md,
    padding: 10,
    minHeight: 180,
  },
  saveBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
