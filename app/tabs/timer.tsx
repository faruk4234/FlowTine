import { routineFeedback } from '@/src/feedback/routine-feedback';
import { activeRoutineIdAtom, autoAdvanceEnabledAtom, routineCueSoundsEnabledAtom, routinesAtom, soundVibrationEnabledAtom, timerRunningAtom, type Movement, } from '@/src/state/atoms';
import { BorderRadius, Spacing, Typography } from '@/src/state/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Platform,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0F1115',
  surface: '#1A1D23',
  surfaceHigh: '#22262F',
  border: '#2A2E38',
  text: '#F1F5F9',
  textMuted: '#9CA3AF',
  textDim: '#64748B',
  blue: '#3B82F6',
  orange: '#F97316',
  green: '#10B981',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad(n: number) { return String(Math.floor(Math.max(0, n))).padStart(2, '0'); }

function formatTime(s: number) {
  if (s >= 3600) {
    return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
  }
  return `${pad(s / 60)}:${pad(s % 60)}`;
}

/** Sum work durations of movements starting from index `from`. */
function totalRemainingSeconds(movements: Movement[], fromIndex: number): number {
  return movements.slice(fromIndex).reduce((acc, m) => {
    return acc + movementSeconds(m);
  }, 0);
}

function movementSeconds(m: Movement): number {
  return (m.durationMin * 60 + m.durationSec) * Math.max(1, m.repeatCount ?? 1);
}

// ─── Circular ring ────────────────────────────────────────────────────────────
const RING = 260;
const STROKE = 9;

type RingProps = { progress: number; color?: string };

function CircularRing({ progress, color = C.blue }: RingProps) {
  const p = Math.max(Math.min(progress, 1), 0);
  const half = RING / 2;
  const rightDeg = p <= 0.5 ? p * 360 : 180;
  const leftDeg = p <= 0.5 ? 0 : (p - 0.5) * 360;

  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Track */}
      <View style={{
        position: 'absolute', width: RING, height: RING, borderRadius: half,
        borderWidth: STROKE, borderColor: color, // The entire circle starts full (colored)
      }} />

      {/* Right Hemisphere Mask (0° to 180°, 12 o'clock to 6 o'clock) */}
      <View style={{ position: 'absolute', left: half, width: half, height: RING, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: -half, width: RING, height: RING, borderRadius: half,
          borderWidth: STROKE, borderColor: 'transparent',
          borderTopColor: C.surface, borderLeftColor: C.surface, // The sweeping eraser track (gray)
          transform: [{ rotate: '-45deg' }, { rotate: `${rightDeg}deg` }],
        }} />
      </View>

      {/* Left Hemisphere Mask (180° to 360°, 6 o'clock to 12 o'clock) */}
      <View style={{ position: 'absolute', left: 0, width: half, height: RING, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: 0, width: RING, height: RING, borderRadius: half,
          borderWidth: STROKE, borderColor: 'transparent',
          borderBottomColor: C.surface, borderRightColor: C.surface, // The sweeping eraser track (gray)
          transform: [{ rotate: '-45deg' }, { rotate: `${leftDeg}deg` }],
        }} />
      </View>
    </View>
  );
}

// ─── Timer screen ─────────────────────────────────────────────────────────────
type Phase = 'work' | 'rest' | 'done';

export default function TimerScreen() {
  const router = useRouter();
  // Get routine ID from URL params for reliability
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const [isRunning, setIsRunning] = useAtom(timerRunningAtom);
  const setActiveId = useSetAtom(activeRoutineIdAtom);
  const activeId = useAtomValue(activeRoutineIdAtom);
  const routines = useAtomValue(routinesAtom);
  const isAutoAdvance = useAtomValue(autoAdvanceEnabledAtom);
  const routineSoundsOn = useAtomValue(routineCueSoundsEnabledAtom);
  const feedbackEnabled = useAtomValue(soundVibrationEnabledAtom);
  const transportFeedbackAt = useRef(0);
  const TRANSPORT_FEEDBACK_GAP_MS = 220;

  const safeRoutines = Array.isArray(routines) ? routines : [];
  // Prefer URL param ID over atom (avoids hydration race)
  const routineId = paramId ?? activeId;
  const routine = safeRoutines.find((r) => r.id === routineId) ?? safeRoutines[0];
  const movements: Movement[] = Array.isArray(routine?.movements) ? routine!.movements : [];

  // ── per-movement / per-phase state ──
  const [movIdx, setMovIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('work');
  const [seconds, setSeconds] = useState(() => movementSeconds(movements[0] ?? { durationMin: 0, durationSec: 30, id: '', name: '', description: '', restSec: 0 }));

  const currentMov = movements[movIdx];
  const nextMov = movements[movIdx + 1] ?? null;

  // Total remaining work time (not counting current phase — just info label)
  const totalRemaining = totalRemainingSeconds(movements, movIdx);

  // Phase duration for the ring to compute progress correctly
  const phaseDuration = phase === 'work'
    ? movementSeconds(currentMov ?? { durationMin: 0, durationSec: 30, id: '', name: '', description: '', restSec: 0 })
    : (currentMov?.restSec ?? 30);
  const progress = phaseDuration > 0 ? (phaseDuration - seconds) / phaseDuration : 0;

  // Ring color: blue for work, orange for rest
  const ringColor = phase === 'rest' ? C.orange : C.blue;

  // ── advance logic ──
  const advance = useCallback(() => {
    const isLastMovement = movIdx >= movements.length - 1;

    if (phase === 'work') {
      // Last movement: skip rest entirely → done
      if (isLastMovement) {
        setPhase('done');
        setIsRunning(false);
        return;
      }
      // Not last: enter rest if configured, otherwise go straight to next
      const restSec = currentMov?.restSec ?? 0;
      if (restSec > 0) {
        setPhase('rest');
        setSeconds(restSec);
      } else {
        const nextIdx = movIdx + 1;
        setMovIdx(nextIdx);
        setPhase('work');
        setSeconds(movementSeconds(movements[nextIdx]));
      }
    } else {
      // rest ended → next movement (rest only happens between movements, never after last)
      const nextIdx = movIdx + 1;
      if (nextIdx < movements.length) {
        setMovIdx(nextIdx);
        setPhase('work');
        setSeconds(movementSeconds(movements[nextIdx]));
      } else {
        setPhase('done');
        setIsRunning(false);
      }
    }
  }, [phase, movIdx, movements, currentMov, setIsRunning]);

  const segmentKey = `${movIdx}-${phase}`;
  const goSegmentRef = useRef<string | null>(null);
  const preCueSegmentRef = useRef<string | null>(null);
  const stepCompleteWorkIdxRef = useRef<number | null>(null);
  const routineCompleteFiredRef = useRef(false);

  // Background-safe timer: drive countdown by an absolute end timestamp.
  const segmentEndsAtMsRef = useRef<number | null>(null);
  const notifIdsRef = useRef<string[]>([]);
  const movIdxRef = useRef(movIdx);
  const phaseRef = useRef<Phase>(phase);
  const isRunningRef = useRef(isRunning);
  const secondsRef = useRef(seconds);

  useEffect(() => { movIdxRef.current = movIdx; }, [movIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  useEffect(() => {
    goSegmentRef.current = null;
    preCueSegmentRef.current = null;
    stepCompleteWorkIdxRef.current = null;
    routineCompleteFiredRef.current = false;
  }, [routineId]);

  useEffect(() => {
    void routineFeedback.preload();
  }, []);

  useEffect(() => {
    // Ensure notifications make sound while app is backgrounded/locked.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (!perm.granted) {
          await Notifications.requestPermissionsAsync();
        }
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('timer', {
            name: 'Timer',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }
      } catch {
        // If permissions fail, timer still works; background cues won't.
      }
    };
    void init();
  }, []);

  const cancelTimerNotifs = useCallback(async () => {
    const ids = notifIdsRef.current;
    notifIdsRef.current = [];
    await Promise.allSettled(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }, []);

  const scheduleTimerNotifs = useCallback(async (opts: { phase: Phase; movIdx: number; seconds: number; movementName?: string }) => {
    await cancelTimerNotifs();
    if (!isRunningRef.current || opts.phase === 'done' || opts.seconds <= 0) return;

    const title = opts.phase === 'rest' ? 'Rest finished' : 'Work finished';
    const body = opts.phase === 'rest'
      ? `Go: ${opts.movementName ?? 'Next movement'}`
      : `Next up: ${opts.movementName ?? 'Rest'}`;

    try {
      const endId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'timer' } : null),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.floor(opts.seconds)), repeats: false },
      });
      notifIdsRef.current.push(endId);

      // "Get ready" cue for rest phases ~2s before it ends.
      if (opts.phase === 'rest' && opts.seconds > 3) {
        const readyId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Get ready',
            body: 'Starting soon',
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'timer' } : null),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.floor(opts.seconds - 2)), repeats: false },
        });
        notifIdsRef.current.push(readyId);
      }
    } catch {
      // ignore scheduling errors
    }
  }, [cancelTimerNotifs]);

  const computeNextAfterZero = useCallback((state: { movIdx: number; phase: Phase; movements: Movement[]; currentMov?: Movement | null }) => {
    const { movIdx: idx, phase: ph, movements: movs, currentMov: mov } = state;
    const isLastMovement = idx >= movs.length - 1;

    if (ph === 'work') {
      if (isLastMovement) {
        return { movIdx: idx, phase: 'done' as const, seconds: 0 };
      }
      const restSec = mov?.restSec ?? 0;
      if (restSec > 0) {
        return { movIdx: idx, phase: 'rest' as const, seconds: restSec };
      }
      const nextIdx = idx + 1;
      return { movIdx: nextIdx, phase: 'work' as const, seconds: movementSeconds(movs[nextIdx]) };
    }

    // rest ended → next movement
    const nextIdx = idx + 1;
    if (nextIdx < movs.length) {
      return { movIdx: nextIdx, phase: 'work' as const, seconds: movementSeconds(movs[nextIdx]) };
    }
    return { movIdx: idx, phase: 'done' as const, seconds: 0 };
  }, []);

  const syncTimerToNow = useCallback(async () => {
    if (!isRunningRef.current) return;
    if (phaseRef.current === 'done') return;
    const endsAt = segmentEndsAtMsRef.current;
    if (!endsAt) return;

    const now = Date.now();
    let nextEndsAt = endsAt;
    let nextMovIdx = movIdxRef.current;
    let nextPhase: Phase = phaseRef.current;
    let nextSeconds = secondsRef.current;

    // If we were backgrounded long enough to cross segment boundaries, step forward.
    while (now >= nextEndsAt) {
      const current = movements[nextMovIdx];
      const nextState = computeNextAfterZero({ movIdx: nextMovIdx, phase: nextPhase, movements, currentMov: current });
      nextMovIdx = nextState.movIdx;
      nextPhase = nextState.phase;
      nextSeconds = nextState.seconds;
      nextEndsAt = nextEndsAt + nextSeconds * 1000;
      if (nextPhase === 'done') break;
      if (!isAutoAdvance) {
        // If auto-advance is off, stop at the boundary.
        break;
      }
    }

    if (nextPhase === 'done') {
      segmentEndsAtMsRef.current = null;
      await cancelTimerNotifs();
      setMovIdx(nextMovIdx);
      setPhase('done');
      setSeconds(0);
      setIsRunning(false);
      return;
    }

    const remaining = Math.max(0, Math.ceil((nextEndsAt - now) / 1000));
    segmentEndsAtMsRef.current = now + remaining * 1000;

    // Apply state if we stepped forward.
    if (nextMovIdx !== movIdxRef.current) setMovIdx(nextMovIdx);
    if (nextPhase !== phaseRef.current) setPhase(nextPhase);
    setSeconds(remaining);

    await scheduleTimerNotifs({
      phase: nextPhase,
      movIdx: nextMovIdx,
      seconds: remaining,
      movementName: nextPhase === 'rest' ? movements[nextMovIdx + 1]?.name : movements[nextMovIdx]?.name,
    });
  }, [cancelTimerNotifs, computeNextAfterZero, isAutoAdvance, movements, scheduleTimerNotifs, setIsRunning]);

  // Pre-cue: rest only — ~1–2 s before rest ends (prepare for next work). No pre-cue during work.
  useEffect(() => {
    if (!isRunning || phase !== 'rest') return;
    if (phaseDuration <= 2 || seconds !== 2) return;
    const key = `${segmentKey}-pre`;
    if (preCueSegmentRef.current === key) return;
    preCueSegmentRef.current = key;
    void routineFeedback.playIncoming(routineSoundsOn);
  }, [isRunning, phase, phaseDuration, seconds, segmentKey, routineSoundsOn]);

  // "Go!" — work phases only (never when rest starts or ends)
  useEffect(() => {
    if (!isRunning || phase !== 'work') return;
    if (seconds !== phaseDuration) return;
    if (goSegmentRef.current === segmentKey) return;
    goSegmentRef.current = segmentKey;
    void routineFeedback.playStart(routineSoundsOn);
  }, [isRunning, phase, seconds, phaseDuration, segmentKey, routineSoundsOn]);

  // Work segment finished (natural countdown only — not skip)
  useEffect(() => {
    if (seconds !== 0 || phase !== 'work' || !isRunning) return;
    if (stepCompleteWorkIdxRef.current === movIdx) return;
    stepCompleteWorkIdxRef.current = movIdx;
    void routineFeedback.playStepComplete(routineSoundsOn);
  }, [seconds, phase, movIdx, isRunning, routineSoundsOn]);

  // Routine finished
  useEffect(() => {
    if (phase !== 'done' || routineCompleteFiredRef.current) return;
    routineCompleteFiredRef.current = true;
    void routineFeedback.playRoutineComplete(routineSoundsOn);
  }, [phase, routineSoundsOn]);

  // ── countdown tick ──
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isRunning && phase !== 'done') {
      // Ensure we have an absolute end timestamp (survives background/lock).
      if (!segmentEndsAtMsRef.current) {
        segmentEndsAtMsRef.current = Date.now() + seconds * 1000;
        void scheduleTimerNotifs({
          phase,
          movIdx,
          seconds,
          movementName: phase === 'rest' ? movements[movIdx + 1]?.name : movements[movIdx]?.name,
        });
      }

      intervalRef.current = setInterval(() => {
        const endsAt = segmentEndsAtMsRef.current;
        if (!endsAt) return;
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
        setSeconds((prev) => (prev === remaining ? prev : remaining));
      }, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase]);

  // When seconds hit 0 auto-advance
  useEffect(() => {
    if (seconds === 0 && isRunning) {
      advance();
      if (!isAutoAdvance) {
        setIsRunning(false);
      }
    }
  }, [seconds, isRunning, advance, isAutoAdvance, setIsRunning]);

  // Update end timestamp + notifications whenever we switch segments while running.
  useEffect(() => {
    if (!isRunning || phase === 'done') return;
    segmentEndsAtMsRef.current = Date.now() + seconds * 1000;
    void scheduleTimerNotifs({
      phase,
      movIdx,
      seconds,
      movementName: phase === 'rest' ? movements[movIdx + 1]?.name : movements[movIdx]?.name,
    });
  }, [movIdx, phase]);

  // Sync on app resume / foreground.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void syncTimerToNow();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [syncTimerToNow]);

  useEffect(() => {
    void routineFeedback.preloadTransport();
  }, []);

  const handlePauseResume = useCallback(() => {
    setIsRunning((wasRunning) => {
      const next = !wasRunning;
      if (phase === 'done' || !currentMov) return next;

      if (next) {
        // resume
        segmentEndsAtMsRef.current = Date.now() + secondsRef.current * 1000;
        void scheduleTimerNotifs({
          phase: phaseRef.current,
          movIdx: movIdxRef.current,
          seconds: secondsRef.current,
          movementName: phaseRef.current === 'rest' ? movements[movIdxRef.current + 1]?.name : movements[movIdxRef.current]?.name,
        });
      } else {
        // pause
        const endsAt = segmentEndsAtMsRef.current;
        if (endsAt) {
          const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
          segmentEndsAtMsRef.current = null;
          setSeconds(remaining);
        }
        void cancelTimerNotifs();
      }

      if (feedbackEnabled) {
        const now = Date.now();
        if (now - transportFeedbackAt.current < TRANSPORT_FEEDBACK_GAP_MS) {
          return next;
        }
        transportFeedbackAt.current = now;
        if (next) {
          void routineFeedback.playResume(feedbackEnabled);
        } else {
          void routineFeedback.playPause(feedbackEnabled);
        }
      }
      return next;
    });
  }, [phase, currentMov, feedbackEnabled, setIsRunning, cancelTimerNotifs, movements, scheduleTimerNotifs]);

  function handleBack() {
    if (phase === 'rest') {
      // Jump back to work phase of current movement
      setPhase('work');
      setSeconds(movementSeconds(currentMov));
    } else if (movIdx > 0) {
      const prevIdx = movIdx - 1;
      setMovIdx(prevIdx);
      setPhase('work');
      setSeconds(movementSeconds(movements[prevIdx]));
    }
    setIsRunning(false);
  }

  function handleSkip() {
    setIsRunning(false);
    segmentEndsAtMsRef.current = null;
    void cancelTimerNotifs();
    advance();
  }

  function handleEnd() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    segmentEndsAtMsRef.current = null;
    void cancelTimerNotifs();
    setIsRunning(false);
    setActiveId(null);
    router.back();
  }

  // ── Done screen ──
  if (phase === 'done') {
    return (
      <View style={ts.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <SafeAreaView style={ts.center}>
          <View style={ts.doneIconWrap}>
            <Ionicons name="checkmark" size={48} color={C.green} />
          </View>
          <Text style={ts.doneTitle}>Routine Complete!</Text>
          <Text style={ts.doneSub}>{routine?.title}</Text>
          <TouchableOpacity style={ts.doneBtn} onPress={handleEnd}>
            <Text style={ts.doneBtnText}>Back to Routines</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // If no movements, early exit
  if (!currentMov) {
    return (
      <View style={ts.root}>
        <SafeAreaView style={ts.center}>
          <Text style={{ color: C.textMuted, fontSize: 16 }}>No movements added.</Text>
          <TouchableOpacity style={[ts.doneBtn, { marginTop: 24 }]} onPress={handleEnd}>
            <Text style={ts.doneBtnText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={ts.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={ts.container}>

          {/* Top: routine name + movement progress */}
          <View style={ts.topBar}>
            <Text style={ts.routineLabel} numberOfLines={1}>{routine?.title}</Text>
            <Text style={ts.progressLabel}>{movIdx + 1} / {movements.length}</Text>
          </View>

          {/* Phase badge */}
          <View style={[ts.phaseBadge, { backgroundColor: phase === 'rest' ? `${C.orange}20` : `${C.blue}20` }]}>
            <Text style={[ts.phaseText, { color: phase === 'rest' ? C.orange : C.blue }]}>
              {phase === 'rest' ? '⏳ REST' : '▶ WORK'}
            </Text>
          </View>

          {/* Current movement name */}
          <Text style={ts.movementName} numberOfLines={2}>{currentMov.name}</Text>

          {/* Ring + timer */}
          <View style={ts.ringSection}>
            <CircularRing progress={progress} color={ringColor} />
            <View style={ts.ringOverlay}>
              <Text style={ts.timerText}>{formatTime(seconds)}</Text>
              <Text style={ts.timerSub}>
                {phase === 'rest' ? 'REST' : 'REMAINING'}
              </Text>
            </View>
          </View>

          {/* Total remaining time info */}
          <Text style={ts.totalLabel}>
            Total remaining: {formatTime(totalRemaining)}
          </Text>

          {/* Controls: back · pause/play · skip */}
          <View style={ts.controls}>
            <TouchableOpacity
              style={[ts.ctrlSecondary, movIdx === 0 && phase === 'work' && ts.ctrlDisabled]}
              onPress={handleBack}
              activeOpacity={0.7}
              disabled={movIdx === 0 && phase === 'work'}
            >
              <Ionicons name="play-skip-back" size={22} color={movIdx === 0 && phase === 'work' ? C.textDim : C.text} />
            </TouchableOpacity>

            <TouchableOpacity style={ts.ctrlPrimary} onPress={handlePauseResume} activeOpacity={0.85}>
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={32}
                color="#FFF"
                style={{ marginLeft: isRunning ? 0 : 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity style={ts.ctrlSecondary} onPress={handleSkip} activeOpacity={0.7}>
              <Ionicons name="play-skip-forward" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Up Next card */}
          {nextMov && (
            <View style={ts.upNextCard}>
              <View style={{ flex: 1 }}>
                <Text style={ts.upNextLabel}>UP NEXT</Text>
                <Text style={ts.upNextTitle} numberOfLines={1}>{nextMov.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </View>
          )}

          {/* End */}
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
  root: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.screenHorizontal, paddingTop: Spacing.sm, paddingBottom: Platform.OS === 'android' ? Spacing.md : Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.screenHorizontal },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  routineLabel: { ...Typography.bodySmall, fontWeight: '600', color: C.textMuted, flex: 1 },
  progressLabel: { ...Typography.bodySmall, fontWeight: '700', color: C.textDim },

  // Phase
  phaseBadge: { paddingHorizontal: Spacing.md - 2, paddingVertical: 5, borderRadius: BorderRadius.round, marginTop: Spacing.sm },
  phaseText: { ...Typography.caption, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  // Movement name
  movementName: { ...Typography.title, fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center', marginTop: Spacing.xs + 2, lineHeight: 28 },

  // Ring
  ringSection: { alignItems: 'center', justifyContent: 'center' },
  ringOverlay: { position: 'absolute', alignItems: 'center' },
  timerText: { ...Typography.hero, fontSize: 52, fontWeight: '800', color: C.text, letterSpacing: -2 },
  timerSub: { ...Typography.caption, fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 2, marginTop: Spacing.xs - 2 },

  // Total
  totalLabel: { ...Typography.caption, fontSize: 13, color: C.textMuted, fontWeight: '500' },

  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.screenHorizontal },
  ctrlPrimary: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', shadowColor: C.blue, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  ctrlSecondary: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  ctrlDisabled: { opacity: 0.3 },

  // Up next
  upNextCard: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md - 2, paddingHorizontal: Spacing.md + 2, borderWidth: 1, borderColor: C.border },
  upNextLabel: { ...Typography.caption, fontSize: 9, fontWeight: '700', color: C.textDim, letterSpacing: 1.4, marginBottom: Spacing.xs - 1 },
  upNextTitle: { ...Typography.bodyMedium, fontSize: 15, fontWeight: '600', color: C.text },

  // End
  endBtn: { paddingVertical: Spacing.sm - 2 },
  endBtnText: { ...Typography.caption, fontWeight: '700', color: '#EF4444', letterSpacing: 1.2 },

  // Done screen
  doneIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: `${C.green}20`, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.screenHorizontal },
  doneTitle: { ...Typography.title, fontSize: 28, fontWeight: '800', color: C.text, marginBottom: Spacing.sm },
  doneSub: { ...Typography.bodyMedium, color: C.textMuted, marginBottom: Spacing.screenHorizontal * 2 },
  doneBtn: { backgroundColor: C.blue, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md + 2, paddingHorizontal: 48 },
  doneBtnText: { ...Typography.bodyMedium, fontWeight: '700', color: '#FFF' },
});
