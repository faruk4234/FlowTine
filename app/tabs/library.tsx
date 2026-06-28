import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAtom } from "jotai";
import { Ionicons } from "@expo/vector-icons";

import {
  savedLyricsAtom,
  activeTrackAtom,
  isPlayingAtom,
  type Track,
} from "@/src/state/atoms";
import { useAppTheme, Spacing, BorderRadius, Typography } from "@/src/state/theme";
import { apiService } from "@/src/services/api";

type TabType = "songs" | "lyrics";

export default function LibraryScreen() {
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>("songs");
  
  const [savedLyrics, setSavedLyrics] = useAtom(savedLyricsAtom);

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
  const [activeTrack, setActiveTrack] = useAtom(activeTrackAtom);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);

  const [songs, setSongs] = useState<Track[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  const fetchSongs = async () => {
    setLoadingSongs(true);
    try {
      const data = await apiService.getUserSongs();
      // Ensure data maps correctly to Track structure
      setSongs(data);
    } catch (e) {
      console.error("Failed to fetch generated songs:", e);
      Alert.alert("Fetch Failed", "Could not load generated songs. Please pull to refresh.");
    } finally {
      setLoadingSongs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "songs") {
      fetchSongs();
    }
  }, [activeTab]);

  const handlePlaySong = (song: Track) => {
    if (activeTrack?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setActiveTrack(song);
      setIsPlaying(true);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        {/* Segmented Top Tab */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: theme.colors.text }]}>Library</Text>
          <TouchableOpacity
            style={[s.refreshBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            onPress={fetchSongs}
            disabled={loadingSongs && activeTab === "songs"}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[s.tabContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[
              s.tabButton,
              activeTab === "songs" && { backgroundColor: theme.colors.surfaceElevated },
            ]}
            onPress={() => setActiveTab("songs")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="musical-notes"
              size={16}
              color={activeTab === "songs" ? theme.colors.primary : theme.colors.mutedText}
            />
            <Text
              style={[
                s.tabButtonText,
                { color: activeTab === "songs" ? theme.colors.text : theme.colors.mutedText },
              ]}
            >
              Songs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.tabButton,
              activeTab === "lyrics" && { backgroundColor: theme.colors.surfaceElevated },
            ]}
            onPress={() => setActiveTab("lyrics")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text"
              size={16}
              color={activeTab === "lyrics" ? theme.colors.primary : theme.colors.mutedText}
            />
            <Text
              style={[
                s.tabButtonText,
                { color: activeTab === "lyrics" ? theme.colors.text : theme.colors.mutedText },
              ]}
            >
              Lyrics
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "songs" ? (
          loadingSongs ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[s.loadingText, { color: theme.colors.mutedText }]}>Retrieving track records...</Text>
            </View>
          ) : songs.length === 0 ? (
            <View style={s.center}>
              <Ionicons name="disc-outline" size={64} color={theme.colors.mutedText} />
              <Text style={[s.emptyText, { color: theme.colors.text }]}>No generated songs found</Text>
              <Text style={[s.emptySubtext, { color: theme.colors.mutedText }]}>
                Head over to the Studio tab and create your first track!
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
              {songs.map((song) => {
                const isCurrent = activeTrack?.id === song.id;
                return (
                  <TouchableOpacity
                    key={song.id}
                    style={[
                      s.songCard,
                      { backgroundColor: theme.colors.surface },
                      isCurrent && { borderColor: theme.colors.primary, borderWidth: 1 },
                    ]}
                    onPress={() => handlePlaySong(song)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.playCircle, { backgroundColor: theme.colors.surfaceElevated }]}>
                      <Ionicons
                        name={isCurrent && isPlaying ? "pause" : "play"}
                        size={20}
                        color={isCurrent ? theme.colors.primary : theme.colors.text}
                      />
                    </View>
                    <View style={s.songInfo}>
                      <Text style={[s.songTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[s.songDetails, { color: theme.colors.mutedText }]}>
                        {song.genre ? `${song.genre.toUpperCase()} • ` : ""}{song.voice ? `${song.voice.toUpperCase()}` : ""}
                      </Text>
                    </View>
                    <View style={s.songRight}>
                      <Text style={[s.durationText, { color: theme.colors.mutedText }]}>
                        3:00
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        ) : savedLyrics.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.mutedText} />
            <Text style={[s.emptyText, { color: theme.colors.text }]}>No saved lyrics</Text>
            <Text style={[s.emptySubtext, { color: theme.colors.mutedText }]}>
              Create some custom lyrics on the Lyrics tab first.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            {savedLyrics.map((lyric) => (
              <View key={lyric.id} style={[s.lyricCard, { backgroundColor: theme.colors.surface }]}>
                <View style={s.lyricHeader}>
                  <Ionicons name="document-text" size={18} color={theme.colors.primary} />
                  <TextInput
                    style={[s.lyricTitleInline, { color: theme.colors.text }]}
                    value={lyric.title}
                    onChangeText={(val) => handleEditTitle(lyric.id, val)}
                    placeholder="Untitled"
                    placeholderTextColor={theme.colors.mutedText}
                  />
                </View>
                <TextInput
                  style={[s.lyricContentInline, { color: theme.colors.mutedText }]}
                  multiline
                  value={lyric.content}
                  onChangeText={(val) => handleEditContent(lyric.id, val)}
                  placeholder="Type lyrics here..."
                  placeholderTextColor={theme.colors.mutedText}
                />
                <Text style={[s.lyricDate, { color: theme.colors.mutedText }]}>
                  Saved: {lyric.createdAt}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
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
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.hero,
    fontSize: 28,
    fontWeight: "800",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    height: 50,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.screenHorizontal,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
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
  listContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: 110, // Buffer space for persistent bottom audio player
    gap: Spacing.sm + 4,
  },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    gap: 4,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  songDetails: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  songRight: {
    justifyContent: "center",
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  lyricCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  lyricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lyricTitleInline: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    padding: 0,
    margin: 0,
  },
  lyricContentInline: {
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
    margin: 0,
    marginTop: 6,
    marginBottom: 6,
    textAlignVertical: "top",
  },
  lyricDate: {
    fontSize: 10,
    fontWeight: "600",
  },
});
