import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useAtom } from "jotai";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

import { activeTrackAtom, isPlayingAtom } from "@/src/state/atoms";
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

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

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
      setDuration(status.durationMillis || 0);
      
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
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [activeTrack, isPlaying]);

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
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
      setSound(null);
    }
  };

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
        {/* Play controls */}
        <TouchableOpacity
          style={[s.playBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => setIsPlaying(!isPlaying)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={theme.colors.text} />
          )}
        </TouchableOpacity>

        {/* Track Title & Metadata */}
        <View style={s.trackInfo}>
          <Text style={[s.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {activeTrack.title}
          </Text>
          <Text style={[s.trackDuration, { color: theme.colors.mutedText }]}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

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
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
