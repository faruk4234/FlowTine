import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { useAtom } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

import {
  activeTrackAtom,
  isPlayingAtom,
  playbackPositionAtom,
  playbackDurationAtom,
} from "@/src/state/atoms";
import { audioController } from "@/src/services/audioController";
import { AppPalette as C } from "@/src/state/colors";
import { useAppTheme } from "@/src/state/theme";
import { downloadService } from "@/src/services/download";

const { width } = Dimensions.get("window");

// ─── Waveform Animation Bar Component ─────────────────────────────────────────
function VisualizerBar({ isPlaying, delay }: { isPlaying: boolean; delay: number }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isPlaying) {
      // Loop heights up and down with dynamic values
      height.value = withRepeat(
        withSequence(
          withTiming(12 + Math.random() * 18, { duration: 250 + delay }),
          withTiming(4, { duration: 250 })
        ),
        -1, // Infinite repeat
        true // Reverse direction
      );
    } else {
      // Reset back to static small value
      cancelAnimation(height);
      height.value = withTiming(4, { duration: 300 });
    }
  }, [isPlaying, delay, height]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        s.visualizerBar,
        animStyle,
        { backgroundColor: C.blue },
      ]}
    />
  );
}

// ─── Persistent Bottom Audio Player ───────────────────────────────────────────
export default function AudioPlayer() {
  const theme = useAppTheme();
  const [activeTrack, setActiveTrack] = useAtom(activeTrackAtom);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const [position, setPosition] = useAtom(playbackPositionAtom);
  const [duration, setDuration] = useAtom(playbackDurationAtom);
  const pathname = usePathname();
  const router = useRouter();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

  // Configure background audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((err) => console.warn("Failed to set background audio mode:", err));
  }, []);

  // Synchronize playback status updates
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      if (status.durationMillis && status.durationMillis > 0) {
        setDuration(status.durationMillis);
      } else if (activeTrack?.duration && duration === 0) {
        setDuration(activeTrack.duration * 1000);
      }
      
      // Update isPlaying if player finishes or triggers pause externally
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const onPlaybackStatusUpdateRef = useRef(onPlaybackStatusUpdate);
  onPlaybackStatusUpdateRef.current = onPlaybackStatusUpdate;

  // Load track when activeTrack changes
  useEffect(() => {
    async function loadTrack() {
      if (!activeTrack) return;

      setLoading(true);
      // Unload existing audio first
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.warn("Unloading failed:", e);
        }
      }

      try {
        const trackId = activeTrack._id || activeTrack.id;
        const localPath = trackId ? await downloadService.checkLocalFile(trackId) : null;
        const targetUri = localPath || activeTrack.localUri || activeTrack.fileUrl || activeTrack.url;
        if (!targetUri) {
          console.warn("No audio URI available for track:", activeTrack.title);
          setLoading(false);
          return;
        }

        console.log(`🎵 [AudioPlayer] Loading track "${activeTrack.title}" from:`, localPath ? "Local Storage 📱" : "Remote URL 🌐");
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: targetUri },
          { shouldPlay: isPlaying },
          (status) => onPlaybackStatusUpdateRef.current(status)
        );
        soundRef.current = newSound;
        audioController.setSound(newSound);
        setSound(newSound);
      } catch (e) {
        console.error("Failed to load audio stream:", e);
      } finally {
        setLoading(false);
      }
    }

    loadTrack();

    // Cleanup hook
    return () => {
      if (soundRef.current) {
        audioController.setSound(null);
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [activeTrack?.id, activeTrack?._id, activeTrack?.url, activeTrack?.fileUrl, activeTrack?.localUri]);

  // Handle Play/Pause updates
  useEffect(() => {
    async function syncPlayback() {
      if (!soundRef.current) return;
      try {
        if (isPlaying) {
          await soundRef.current.playAsync();
        } else {
          await soundRef.current.pauseAsync();
        }
      } catch (e) {
        console.warn("Sync playback failed:", e);
      }
    }
    syncPlayback();
  }, [isPlaying, sound]);

  // Mini vinyl rotation animation
  const miniRotation = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      miniRotation.value = withRepeat(
        withTiming(miniRotation.value + 360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(miniRotation);
    }
  }, [isPlaying]);

  const animatedMiniDiskStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${miniRotation.value % 360}deg` }],
  }));

  if (!activeTrack) return null;

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleProgressBarClick = async (event: any) => {
    if (!soundRef.current || duration === 0) return;
    const { locationX } = event.nativeEvent;
    const progressWidth = width - 48; // Account for container paddings
    const clickRatio = Math.max(0, Math.min(1, locationX / progressWidth));
    const targetMillis = clickRatio * duration;
    
    try {
      await soundRef.current.setPositionAsync(targetMillis);
      setPosition(targetMillis);
    } catch (e) {
      console.warn("Seeking failed:", e);
    }
  };

  const handleClosePlayer = async () => {
    setIsPlaying(false);
    setActiveTrack(null);
    if (soundRef.current) {
      audioController.setSound(null);
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
      setSound(null);
    }
  };

  if (!activeTrack || pathname === "/music" || pathname === "/player") {
    return null;
  }

  return (
    <View style={[s.container, { backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border }]}>
      {/* Progress Bar (Clickable seek bar) */}
      <TouchableOpacity
        style={s.progressContainer}
        onPress={handleProgressBarClick}
        activeOpacity={0.9}
      >
        <View style={[s.progressBarBg, { backgroundColor: theme.colors.border }]}>
          <View style={[s.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.primary }]} />
        </View>
      </TouchableOpacity>

      <View style={s.playerRow}>
        {/* Unified Spinning Vinyl Disk Play/Pause Button (Only ONE circle!) */}
        <TouchableOpacity
          style={s.unifiedDiskBtn}
          onPress={() => setIsPlaying(!isPlaying)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Animated.View style={[s.miniVinylDisk, animatedMiniDiskStyle]}>
            <Image
              source={{ uri: activeTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80" }}
              style={s.miniCoverImage}
            />
            <View style={s.miniSpindleHole}>
              <View style={s.miniSpindleCenter} />
            </View>
          </Animated.View>

          {/* Upright Play/Pause Icon Overlay in Center of Disk */}
          <View style={s.diskIconOverlay}>
            {loading ? (
              <ActivityIndicator size="small" color="#00FFA3" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={18}
                color="#FFFFFF"
                style={isPlaying ? {} : { marginLeft: 2 }}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Track Title & Metadata (Clickable to open Spotify Full-Screen Player) */}
        <TouchableOpacity style={s.trackInfo} onPress={() => router.push("/music")} activeOpacity={0.8}>
          <Text style={[s.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {activeTrack.title}
          </Text>
          <Text style={[s.trackDuration, { color: theme.colors.mutedText }]}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </TouchableOpacity>

        {/* Waveform Sound Visualizer (Active loops only when playing) */}
        <View style={s.visualizerGroup}>
          <VisualizerBar isPlaying={isPlaying} delay={0} />
          <VisualizerBar isPlaying={isPlaying} delay={50} />
          <VisualizerBar isPlaying={isPlaying} delay={100} />
          <VisualizerBar isPlaying={isPlaying} delay={150} />
          <VisualizerBar isPlaying={isPlaying} delay={200} />
        </View>

        {/* Close Audio Button */}
        <TouchableOpacity style={s.closeBtn} onPress={handleClosePlayer}>
          <Ionicons name="close" size={20} color={theme.colors.mutedText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 64, // Just above bottom tab bar height (64px)
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 100,
  },
  progressContainer: {
    paddingVertical: 6,
    width: "100%",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  unifiedDiskBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  miniVinylDisk: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0C110F",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  miniCoverImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  miniSpindleHole: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#050D0A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  miniSpindleCenter: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#00FFA3",
  },
  diskIconOverlay: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(5, 13, 10, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
    marginRight: 10,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  trackDuration: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  visualizerGroup: {
    flexDirection: "row",
    alignItems: "center",
    height: 30,
    gap: 3,
    marginRight: 16,
  },
  visualizerBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  closeBtn: {
    padding: 6,
  },
});
