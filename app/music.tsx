import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
  PanResponder,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import {
  activeTrackAtom,
  isPlayingAtom,
  playbackPositionAtom,
  playbackDurationAtom,
  downloadedTrackIdsAtom,
} from "@/src/state/atoms";
import { audioController } from "@/src/services/audioController";
import { downloadService } from "@/src/services/download";
import { useAlert } from "@/src/providers/alert-provider";
import { useAppTheme } from "@/src/state/theme";

const { width, height } = Dimensions.get("window");
const DISK_SIZE = Math.min(width * 0.75, 300);
const COVER_SIZE = DISK_SIZE * 0.48;

export default function MusicPlayerScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [activeTrack] = useAtom(activeTrackAtom);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const [position] = useAtom(playbackPositionAtom);
  const [duration] = useAtom(playbackDurationAtom);
  const [downloadedIds, setDownloadedIds] = useAtom(downloadedTrackIdsAtom);

  const [isDownloading, setIsDownloading] = useState(false);

  // Reanimated vinyl rotation
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, {
          duration: 12000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
    }
  }, [isPlaying]);

  const animatedDiskStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value % 360}deg` }],
    };
  });

  if (!activeTrack) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: "#050D0A" }]}>
        <View style={s.emptyContainer}>
          <Ionicons name="musical-notes" size={64} color="#33413B" />
          <Text style={s.emptyText}>No track currently playing</Text>
          <TouchableOpacity style={s.backBtnEmpty} onPress={() => router.back()}>
            <Text style={s.backBtnEmptyText}>Go Back to Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trackId = activeTrack._id || activeTrack.id;
  const isDownloaded = trackId ? downloadedIds.includes(trackId) : false;
  const coverUrl = activeTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80";

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSeekPress = async (event: any) => {
    if (duration <= 0) return;
    const { locationX } = event.nativeEvent;
    const barWidth = width - 48;
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    const targetMillis = ratio * duration;
    await audioController.seekTo(targetMillis);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    audioController.seekBy(-10000, position, duration);
  };

  const handleSkipForward = () => {
    audioController.seekBy(10000, position, duration);
  };

  const handleDownload = async () => {
    if (!trackId || isDownloaded) return;
    const targetUrl = activeTrack.fileUrl || activeTrack.url;
    if (!targetUrl) {
      showAlert("Download Error", "No audio URL available for this track.");
      return;
    }
    setIsDownloading(true);
    try {
      const localPath = await downloadService.downloadTrack(activeTrack);
      if (localPath) {
        setDownloadedIds((prev) => Array.from(new Set([...prev, trackId])));
        showAlert("Offline Ready 📱", `"${activeTrack.title}" downloaded successfully!`);
      }
    } catch (err: any) {
      showAlert("Download Failed", err?.message || "Could not save track locally.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = activeTrack?.fileUrl || activeTrack?.url || "";
      await Share.share({
        title: activeTrack?.title || "AI Music Track",
        message: `Listen to "${activeTrack?.title || "My AI Track"}" generated on FlowTine AI! 🎵 ${url}`,
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: "#050D0A" }]}>
      {/* Background Ambient Glows */}
      <View style={[s.glowCircle, { backgroundColor: "rgba(0, 255, 163, 0.08)", top: height * 0.15, left: -50 }]} />
      <View style={[s.glowCircle, { backgroundColor: "rgba(0, 255, 163, 0.05)", bottom: height * 0.1, right: -50 }]} />

      {/* 1. Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>PLAYING FROM LIBRARY</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Rotating Vinyl Disk Effect Area */}
      <View style={s.diskContainer}>
        <Animated.View style={[s.vinylDisk, animatedDiskStyle]}>
          {/* Vinyl Grooves */}
          <View style={s.grooveOuter} />
          <View style={s.grooveInner} />

          {/* Album Cover Art in Center */}
          <Image source={{ uri: coverUrl }} style={s.coverImage} />

          {/* Spindle Hole */}
          <View style={s.spindleHole}>
            <View style={s.spindleCenter} />
          </View>
        </Animated.View>
      </View>

      {/* 3. Song Metadata */}
      <View style={s.metaContainer}>
        <Text style={s.songTitle} numberOfLines={1}>{activeTrack.title}</Text>
        <Text style={s.songSubtitle}>
          {activeTrack.genre ? `${activeTrack.genre.toUpperCase()} • ` : ""}
          {activeTrack.voice ? activeTrack.voice.toUpperCase() : "AI AUDIO"}
        </Text>
      </View>

      {/* 4. Interactive Progress Seek Bar */}
      <View style={s.progressSection}>
        <TouchableOpacity style={s.seekBarTouch} onPress={handleSeekPress} activeOpacity={0.9}>
          <View style={s.seekBarBg}>
            <View style={[s.seekBarFill, { width: `${progressPercent}%` }]} />
            <View style={[s.seekThumb, { left: `${progressPercent}%` }]} />
          </View>
        </TouchableOpacity>
        <View style={s.timeRow}>
          <Text style={s.timeText}>{formatTime(position)}</Text>
          <Text style={s.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* 5. Playback Controls Row (Above to Bottom) */}
      <View style={s.controlsRow}>
        {/* Shuffle */}
        <TouchableOpacity style={s.sideControlBtn} activeOpacity={0.7}>
          <Ionicons name="shuffle" size={24} color="#6D8577" />
        </TouchableOpacity>

        {/* Skip Back 10s */}
        <TouchableOpacity style={s.skipBtn} onPress={handleSkipBack} activeOpacity={0.7}>
          <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Huge Play/Pause Circle */}
        <TouchableOpacity style={s.mainPlayBtn} onPress={handleTogglePlay} activeOpacity={0.8}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="#050D0A" style={isPlaying ? {} : { marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Skip Forward 10s */}
        <TouchableOpacity style={s.skipBtn} onPress={handleSkipForward} activeOpacity={0.7}>
          <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Download Offline */}
        <TouchableOpacity style={s.sideControlBtn} onPress={handleDownload} disabled={isDownloading || isDownloaded} activeOpacity={0.7}>
          {isDownloading ? (
            <ActivityIndicator size="small" color="#00FFA3" />
          ) : (
            <Ionicons
              name={isDownloaded ? "checkmark-circle" : "cloud-download-outline"}
              size={26}
              color={isDownloaded ? "#00FFA3" : "#FFFFFF"}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Status / Mode bar */}
      <View style={s.bottomBar}>
        <Ionicons name="hardware-chip-outline" size={14} color="#6D8577" />
        <Text style={s.bottomBarText}>
          {isDownloaded ? "PLAYING FROM LOCAL STORAGE 📱" : "STREAMING HIGH QUALITY AI AUDIO 🌐"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  glowCircle: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6D8577",
    letterSpacing: 1.5,
  },
  diskContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  vinylDisk: {
    width: DISK_SIZE,
    height: DISK_SIZE,
    borderRadius: DISK_SIZE / 2,
    backgroundColor: "#0C110F",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FFA3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 15,
  },
  grooveOuter: {
    position: "absolute",
    width: DISK_SIZE * 0.82,
    height: DISK_SIZE * 0.82,
    borderRadius: (DISK_SIZE * 0.82) / 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  grooveInner: {
    position: "absolute",
    width: DISK_SIZE * 0.65,
    height: DISK_SIZE * 0.65,
    borderRadius: (DISK_SIZE * 0.65) / 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  coverImage: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: COVER_SIZE / 2,
    borderWidth: 2,
    borderColor: "#18221D",
  },
  spindleHole: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#050D0A",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  spindleCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00FFA3",
    opacity: 0.8,
  },
  metaContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  songSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00FFA3",
    letterSpacing: 1.2,
  },
  progressSection: {
    width: "100%",
    marginBottom: 16,
  },
  seekBarTouch: {
    paddingVertical: 12,
    width: "100%",
  },
  seekBarBg: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  seekBarFill: {
    height: "100%",
    borderRadius: 2.5,
    backgroundColor: "#00FFA3",
  },
  seekThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    top: -4.5,
    marginLeft: -7,
    shadowColor: "#00FFA3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6D8577",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  sideControlBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  skipBtn: {
    width: 54,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  mainPlayBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#00FFA3",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FFA3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    gap: 6,
  },
  bottomBarText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6D8577",
    letterSpacing: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#6D8577",
    fontWeight: "600",
  },
  backBtnEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 255, 163, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00FFA3",
  },
  backBtnEmptyText: {
    color: "#00FFA3",
    fontWeight: "700",
  },
  lyricsContainer: {
    flex: 1,
    marginVertical: 16,
  },
  lyricsContent: {
    paddingVertical: 8,
  },
  lyricsHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  lyricsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 16,
  },
  lyricsText: {
    fontSize: 15,
    color: "#D1E0D9",
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tagBadge: {
    backgroundColor: "rgba(0, 255, 163, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00FFA3",
  },
});
