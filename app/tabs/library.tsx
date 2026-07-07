import { ActionButton, Header, SegmentedControl } from "@/src/components";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAtom, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAlert } from "@/src/providers/alert-provider";
import { apiService } from "@/src/services/api";
import { downloadService } from "@/src/services/download";
import { centrifugoService } from "@/src/services/centrifugo";
import {
  activeTrackAtom,
  downloadedTrackIdsAtom,
  downloadingTrackIdsAtom,
  editingLyricAtom,
  isPlayingAtom,
  libraryTabAtom,
  promptOrLyricsTypeAtom,
  savedLyricsAtom,
  statusMusic,
  textInputAtom,
  type SavedLyrics,
  type Track,
} from "@/src/state/atoms";
import { BorderRadius, Spacing, useAppTheme } from "@/src/state/theme";

type TabType = "songs" | "prompts" | "lyrics";

export default function LibraryScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { showAlert } = useAlert();
  const [libraryTab, setLibraryTab] = useAtom(libraryTabAtom);
  const [activeTab, setActiveTab] = useState<TabType>(libraryTab);

  // Sync from atom (set by lyrics.tsx before navigation)
  useEffect(() => {
    setActiveTab(libraryTab);
  }, [libraryTab]);

  // Also sync from URL params as fallback
  useEffect(() => {
    if (tab === "lyrics" || tab === "songs" || tab === "prompts") {
      setActiveTab(tab as TabType);
      setLibraryTab(tab as TabType);
    }
  }, [tab]);

  const [savedLyrics, setSavedLyrics] = useAtom(savedLyricsAtom);
  const setCreateTextInput = useSetAtom(textInputAtom);
  const setCreatePromptType = useSetAtom(promptOrLyricsTypeAtom);
  const setEditingLyric = useSetAtom(editingLyricAtom);

  const handleGenerateSong = (lyric: SavedLyrics) => {
    setCreateTextInput(lyric.content);
    setCreatePromptType("lyrics");
    router.push("/tabs/home");
  };

  const handleEditLyric = (lyric: SavedLyrics) => {
    setEditingLyric(lyric);
    router.push("/tabs/lyrics");
  };

  const handleDeleteLyrics = (id: string) => {
    showAlert(
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
  const [activeTrack, setActiveTrack] = useAtom(activeTrackAtom);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const [downloadedIds, setDownloadedIds] = useAtom(downloadedTrackIdsAtom);
  const [downloadingIds, setDownloadingIds] = useAtom(downloadingTrackIdsAtom);

  const [songs, setSongs] = useState<Track[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  const fetchSongs = async () => {
    setLoadingSongs(true);
    try {
      const data = await apiService.getUserSongs();
      const formatted = (data || []).map((s: any) => ({
        ...s,
        id: s._id || s.id,
        url: s.fileUrl || s.url,
      }));
      setSongs(formatted);

      // Check which tracks exist locally for offline playback
      const validDownloaded: string[] = [];
      for (const song of formatted) {
        if (song.id && await downloadService.checkLocalFile(song.id)) {
          validDownloaded.push(song.id);
        }
      }
      setDownloadedIds((prev) => Array.from(new Set([...prev, ...validDownloaded])));
    } catch (e) {
      console.error("Failed to fetch generated songs:", e);
      showAlert("Fetch Failed", "Could not load generated songs. Please pull to refresh.");
    } finally {
      setLoadingSongs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "songs") {
      fetchSongs();
    }
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === "songs") {
        fetchSongs();
      }
    }, [activeTab])
  );

  useEffect(() => {
    const unsubscribe = centrifugoService.onMusicReady((data) => {
      console.log("🔄 [LibraryScreen] Music ready socket publication received, refetching...", data);
      fetchSongs();
    });
    return () => unsubscribe();
  }, []);

  const handlePlaySong = (song: Track) => {
    const songId = song._id || song.id;
    const status = song.status;
    if (status && status !== statusMusic.DONE && status !== "done") {
      showAlert("Track Processing ⏳", `"${song.title}" is currently generating. We'll notify you when it's ready!`);
      return;
    }
    if (activeTrack && (activeTrack.id === songId || activeTrack._id === songId)) {
      if (!isPlaying) setIsPlaying(true);
      router.push("/music");
    } else {
      setActiveTrack({ ...song, id: songId, url: song.fileUrl || song.url });
      setIsPlaying(true);
      router.push("/music");
    }
  };

  const handleDownloadSong = async (song: Track, e: any) => {
    e.stopPropagation();
    const songId = song._id || song.id;
    if (!songId) return;
    const status = song.status;
    if (status && status !== statusMusic.DONE && status !== "done") {
      showAlert("Not Ready", "Please wait for AI generation to finish before downloading.");
      return;
    }
    if (downloadedIds.includes(songId)) {
      showAlert("Already Saved 📱", `"${song.title}" is available offline on your device!`);
      return;
    }
    if (downloadingIds.includes(songId)) return;

    setDownloadingIds((prev) => [...prev, songId]);
    const localUri = await downloadService.downloadTrack(song);
    setDownloadingIds((prev) => prev.filter((id) => id !== songId));

    if (localUri) {
      setDownloadedIds((prev) => Array.from(new Set([...prev, songId])));
      showAlert("Downloaded Offline 📱", `"${song.title}" is saved locally for offline listening!`);
    } else {
      showAlert("Download Failed", "Could not save track to local storage.");
    }
  };

  const handleDeleteSong = (song: Track, e: any) => {
    e.stopPropagation();
    const songId = song._id || song.id;
    if (!songId) return;

    showAlert(
      "Delete Track",
      `Are you sure you want to permanently delete "${song.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiService.deleteSong(songId);
              await downloadService.deleteLocalFile(songId);
              setDownloadedIds((prev) => prev.filter((id) => id !== songId));
              setSongs((prev) => prev.filter((s) => (s._id || s.id) !== songId));
              if (activeTrack && (activeTrack._id || activeTrack.id) === songId) {
                setActiveTrack(null);
                setIsPlaying(false);
              }
            } catch (err) {
              console.error("Delete failed:", err);
              showAlert("Error", "Could not delete track.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <Header
          title="Library"

        />
        <View style={{ paddingHorizontal: 25, marginTop: 15 }} >
          <SegmentedControl
            options={[
              { id: "songs", label: "Songs", icon: "musical-notes" },
              { id: "prompts", label: "Prompts", icon: "sparkles" },
              { id: "lyrics", label: "Lyrics", icon: "document-text-outline" },
            ]}
            selectedId={activeTab}
            onSelect={(id) => setActiveTab(id as any)}
            height={50}
            style={{}}
          />
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
                const songId = song._id || song.id;
                const isCurrent = activeTrack && (activeTrack.id === songId || activeTrack._id === songId);
                const isReady = !song.status || song.status === statusMusic.DONE || song.status === "done";
                const isErr = song.status === statusMusic.ERROR || song.status === "error";
                const isDownloaded = downloadedIds.includes(songId);
                const isDownloading = downloadingIds.includes(songId);

                return (
                  <TouchableOpacity
                    key={songId}
                    style={[
                      s.songCard,
                      { backgroundColor: theme.colors.surface },
                      isCurrent && { borderColor: theme.colors.primary, borderWidth: 1 },
                    ]}
                    onPress={() => handlePlaySong(song)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.playCircle, { backgroundColor: theme.colors.surfaceElevated, overflow: "hidden" }]}>
                      {song.image ? (
                        <>
                          <Image source={{ uri: song.image }} style={s.coverImage} />
                          <View style={s.imageOverlay}>
                            <Ionicons
                              name={isCurrent && isPlaying ? "pause" : "play"}
                              size={18}
                              color="#FFFFFF"
                            />
                          </View>
                        </>
                      ) : (
                        <Ionicons
                          name={isCurrent && isPlaying ? "pause" : "play"}
                          size={20}
                          color={isCurrent ? theme.colors.primary : theme.colors.text}
                        />
                      )}
                    </View>

                    <View style={s.songInfo}>
                      <Text style={[s.songTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[s.songDetails, { color: theme.colors.mutedText }]}>
                        {song.genre ? `${song.genre.toUpperCase()} • ` : ""}{song.voice ? `${song.voice.toUpperCase()}` : ""}
                      </Text>
                      {!isReady && !isErr && (
                        <View style={[s.statusBadge, { backgroundColor: "rgba(234, 179, 8, 0.15)" }]}>
                          <Text style={[s.statusText, { color: "#EAB308" }]}>⏳ Generating...</Text>
                        </View>
                      )}
                      {isErr && (
                        <View style={[s.statusBadge, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                          <Text style={[s.statusText, { color: "#EF4444" }]}>⚠️ Failed</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.songRight}>
                      <Text style={[s.durationText, { color: theme.colors.mutedText, marginBottom: 4 }]}>
                        {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60) < 10 ? "0" : ""}${song.duration % 60}` : "3:00"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        {isReady && (
                          <TouchableOpacity
                            onPress={(e) => handleDownloadSong(song, e)}
                            style={s.iconButton}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : isDownloaded ? (
                              <Ionicons name="cloud-done" size={18} color={theme.colors.primary} />
                            ) : (
                              <Ionicons name="cloud-download-outline" size={18} color={theme.colors.mutedText} />
                            )}
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={(e) => handleDeleteSong(song, e)}
                          style={s.iconButton}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        ) : activeTab === "prompts" || activeTab === "lyrics" ? (
          (() => {
            const filtered = savedLyrics.filter((l) =>
              activeTab === "prompts" ? l.type === "prompt" : l.type === "lyrics" || !l.type
            );
            if (filtered.length === 0) {
              return (
                <View style={s.center}>
                  <Ionicons
                    name={activeTab === "prompts" ? "sparkles-outline" : "document-text-outline"}
                    size={64}
                    color={theme.colors.mutedText}
                  />
                  <Text style={[s.emptyText, { color: theme.colors.text }]}>
                    {activeTab === "prompts" ? "No saved prompts" : "No saved lyrics"}
                  </Text>
                  <Text style={[s.emptySubtext, { color: theme.colors.mutedText }]}>
                    {activeTab === "prompts"
                      ? "Use the Prompt tab in Lyrics to generate and save."
                      : "Write your own lyrics on the Lyrics tab."}
                  </Text>
                </View>
              );
            }
            return (
              <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
                {filtered.map((lyric) => (
              <View key={lyric.id} style={[s.lyricCard, { backgroundColor: theme.colors.surface }]}>
                <View style={s.lyricHeader}>
                  <Ionicons
                    name={lyric.type === "prompt" ? "sparkles" : "document-text"}
                    size={18}
                    color={theme.colors.primary}
                  />
                  <View style={[
                    s.typeBadge,
                    { backgroundColor: lyric.type === "prompt" ? "rgba(59,130,246,0.15)" : "rgba(249,115,22,0.15)" }
                  ]}>
                    <Text style={[
                      s.typeBadgeText,
                      { color: lyric.type === "prompt" ? theme.colors.primary : "#F97316" }
                    ]}>
                      {lyric.type === "prompt" ? "Prompt" : "Lyrics"}
                    </Text>
                  </View>
                  <Text style={[s.lyricTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {lyric.title}
                  </Text>

                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      onPress={() => handleEditLyric(lyric)}
                      style={[s.iconButton, { backgroundColor: theme.colors.surfaceElevated }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={14} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteLyrics(lyric.id)}
                      style={[s.iconButton, { backgroundColor: theme.colors.surfaceElevated }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[s.lyricSnippet, { color: theme.colors.mutedText }]} numberOfLines={4}>
                  {lyric.content}
                </Text>

                <Text style={[s.lyricDate, { color: theme.colors.mutedText }]}>
                  Saved: {lyric.createdAt}
                </Text>
                <ActionButton
                  title="Generate Song"
                  icon="sparkles"
                  onPress={() => handleGenerateSong(lyric)}
                  style={{ height: 44, marginTop: 12 }}
                />
              </View>
              ))}
            </ScrollView>
            );
          })()
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
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
    paddingTop: Spacing.md,
    paddingBottom: 140, // Expanded buffer space for persistent bottom audio player
    gap: Spacing.md,
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
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
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
  lyricTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  lyricSnippet: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  lyricDate: {
    fontSize: 10,
    fontWeight: "600",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
