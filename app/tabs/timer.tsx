import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAtom, useAtomValue } from 'jotai';
import {
  timerSecondsAtom, timerRunningAtom, activeRoutineIdAtom, routinesAtom,
} from '@/src/state/atoms';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         '#0F1115',
  surface:    '#1A1D23',
  border:     '#2A2E38',
  text:       '#F1F5F9',
  textMuted:  '#9CA3AF',
  textDim:    '#64748B',
  blue:       '#3B82F6',
  blueBg:     'rgba(59,130,246,0.15)',
};

const RING_SIZE   = 260;
const RING_STROKE = 8;
const HALF = (RING_SIZE - RING_STROKE * 2) / 2; // inner radius

// ─── Circular progress ring (CSS-like, no SVG dependency) ────────────────────
// Built with two masked rotated half-circles — works on both iOS and Android.
type RingProps = { progress: number }; // 0 → 1

function CircularRing({ progress }: RingProps) {
  const clamp = Math.min(Math.max(progress, 0), 1);

  // We split the circle into two halves; rotate them based on progress.
  const leftDeg  = clamp <= 0.5 ? clamp * 360 : 180;
  const rightDeg = clamp > 0.5 ? (clamp - 0.5) * 360 : 0;

  const size = RING_SIZE;
  const half = size / 2;
  const stroke = RING_STROKE;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Background ring */}
      <View style={[$ring.base, { width: size, height: size, borderRadius: half, borderColor: C.surface }]} />

      {/* Right slice (0–180°) */}
      <View style={[{ position: 'absolute', width: size, height: size, borderRadius: half, overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', right: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
          <View
            style={{
              width: size, height: size, borderRadius: half,
              borderWidth: stroke, borderColor: C.blue,
              transform: [{ translateX: -half }, { rotate: `${rightDeg}deg` }, { translateX: half }],
            }}
          />
        </View>
      </View>

      {/* Left slice (180–360°) – only visible when progress > 50 % */}
      {clamp > 0.5 && (
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
            <View
              style={{
                width: size, height: size, borderRadius: half,
                borderWidth: stroke, borderColor: C.blue,
                transform: [{ translateX: half }, { rotate: `${leftDeg}deg` }, { translateX: -half }],
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const $ring = StyleSheet.create({
  base: { position: 'absolute', borderWidth: RING_STROKE },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatTime(totalSeconds: number) {
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

// ─── Active Timer Screen ──────────────────────────────────────────────────────
export default function TimerScreen() {
  const router = useRouter();
  const [seconds,    setSeconds]    = useAtom(timerSecondsAtom);
  const [isRunning,  setIsRunning]  = useAtom(timerRunningAtom);
  const [activeId,   setActiveId]   = useAtom(activeRoutineIdAtom);
  const routines = useAtomValue(routinesAtom);

  const safeRoutines = Array.isArray(routines) ? routines : [];
  const activeRoutine = safeRoutines.find((r) => r.id === activeId) ?? safeRoutines[0];
  const totalSeconds  = (activeRoutine?.durationMin ?? 1) * 60;
  const progress      = totalSeconds > 0 ? (totalSeconds - seconds) / totalSeconds : 0;

  // Find the "next up" routine (first non-active one)
  const nextRoutine = safeRoutines.find((r) => r.id !== activeId);

  // Countdown tick
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, setSeconds, setIsRunning]);

  function handlePauseResume() {
    setIsRunning((r) => !r);
  }

  function handleReset() {
    setIsRunning(false);
    setSeconds(totalSeconds);
  }

  function handleSkip() {
    setIsRunning(false);
    setSeconds(0);
  }

  function handleEnd() {
    setIsRunning(false);
    setActiveId(null);
    setSeconds(0);
    router.back();
  }

  return (
    <View style={ts.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={ts.container}>

          {/* Timer ring + counter */}
          <View style={ts.ringSection}>
            <CircularRing progress={progress} />
            {/* Overlaid content */}
            <View style={ts.ringOverlay}>
              <Text style={ts.timerText}>{formatTime(seconds)}</Text>
              <Text style={ts.timerLabel}>SECONDS REMAINING</Text>
            </View>
          </View>

          {/* Routine info */}
          {activeRoutine && (
            <Text style={ts.routineName}>{activeRoutine.title}</Text>
          )}

          {/* Controls: reset · play/pause · skip */}
          <View style={ts.controls}>
            <TouchableOpacity style={ts.ctrlBtnSecondary} onPress={handleReset} activeOpacity={0.7}>
              <Ionicons name="refresh" size={24} color={C.text} />
            </TouchableOpacity>

            <TouchableOpacity style={ts.ctrlBtnPrimary} onPress={handlePauseResume} activeOpacity={0.85}>
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={32}
                color="#FFF"
                style={{ marginLeft: isRunning ? 0 : 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity style={ts.ctrlBtnSecondary} onPress={handleSkip} activeOpacity={0.7}>
              <Ionicons name="play-skip-forward" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Up Next card */}
          {nextRoutine && (
            <View style={ts.upNextCard}>
              <View style={ts.upNextLeft}>
                <Text style={ts.upNextLabel}>UP NEXT</Text>
                <Text style={ts.upNextTitle}>{nextRoutine.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
            </View>
          )}

          {/* End routine */}
          <TouchableOpacity onPress={handleEnd} style={ts.endBtn}>
            <Text style={ts.endBtnText}>END ROUTINE</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ts = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: Platform.OS === 'android' ? 24 : 0 },

  // Ring
  ringSection:  { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ringOverlay:  { position: 'absolute', alignItems: 'center' },
  timerText:    { fontSize: 56, fontWeight: '800', color: C.text, letterSpacing: -2 },
  timerLabel:   { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 2, marginTop: 4 },

  routineName: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 40, textAlign: 'center' },

  // Controls
  controls:       { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 40 },
  ctrlBtnPrimary: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', shadowColor: C.blue, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  ctrlBtnSecondary:{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },

  // Up Next
  upNextCard:   { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, borderWidth: 1, borderColor: C.border, marginBottom: 32 },
  upNextLeft:   { gap: 4 },
  upNextLabel:  { fontSize: 9, fontWeight: '700', color: C.textDim, letterSpacing: 1.4 },
  upNextTitle:  { fontSize: 16, fontWeight: '600', color: C.text },

  // End
  endBtn:     { paddingVertical: 8, paddingHorizontal: 24 },
  endBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444', letterSpacing: 1.2 },
});
