import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TimerPhase, TimerSession } from "./timer-session";

/** Primary storage key (spec). */
export const TIMER_STATE_KEY = "activeTimerState";

/** Legacy key used by earlier builds — read for migration only. */
const LEGACY_TIMER_STATE_KEY = "timer.session";

/** Live timer fields used to build a durable snapshot. */
export type TimerSnapshotInput = {
  routineId: string;
  movIdx: number;
  currentRepeat: number;
  phase: TimerPhase;
  seconds: number;
  isRunning: boolean;
  segmentEndsAtMs: number | null;
};

function remainingMsFromSession(session: TimerSession): number {
  return session.seconds * 1000;
}

/** Derive startedAt from segment end + remaining (for running timers). */
export function sessionStartedAt(session: TimerSession): number | null {
  if (!session.isRunning || !session.segmentEndsAtMs) return null;
  return session.segmentEndsAtMs - remainingMsFromSession(session);
}

/**
 * Build a snapshot from the current timer state.
 * When running, remaining time is derived from the absolute segment end timestamp.
 */
export function buildTimerSnapshot(input: TimerSnapshotInput): TimerSession {
  const now = Date.now();

  if (input.isRunning && input.phase !== "done" && input.segmentEndsAtMs) {
    const remainingSec = Math.max(
      0,
      Math.ceil((input.segmentEndsAtMs - now) / 1000),
    );
    return {
      routineId: input.routineId,
      movIdx: input.movIdx,
      currentRepeat: input.currentRepeat,
      phase: input.phase,
      seconds: remainingSec,
      isRunning: true,
      segmentEndsAtMs: input.segmentEndsAtMs,
      savedAt: now,
    };
  }

  return {
    routineId: input.routineId,
    movIdx: input.movIdx,
    currentRepeat: input.currentRepeat,
    phase: input.phase,
    seconds: input.seconds,
    isRunning: input.isRunning,
    segmentEndsAtMs: null,
    savedAt: now,
  };
}

/**
 * Recalculate elapsed time for a running session loaded from storage.
 * Paused sessions are returned unchanged.
 */
export function reconcileTimerSession(session: TimerSession): TimerSession {
  if (session.phase === "done") return session;

  if (!session.isRunning || !session.segmentEndsAtMs) {
    return { ...session, segmentEndsAtMs: null };
  }

  const now = Date.now();
  const remainingSec = Math.max(
    0,
    Math.ceil((session.segmentEndsAtMs - now) / 1000),
  );

  return {
    ...session,
    seconds: remainingSec,
    segmentEndsAtMs: now + remainingSec * 1000,
  };
}

export function isValidTimerSession(
  session: TimerSession | null | undefined,
  routineIds: Set<string>,
): session is TimerSession {
  if (!session || session.phase === "done") return false;
  return routineIds.has(session.routineId);
}

async function readStoredSession(): Promise<TimerSession | null> {
  const raw =
    (await AsyncStorage.getItem(TIMER_STATE_KEY)) ??
    (await AsyncStorage.getItem(LEGACY_TIMER_STATE_KEY));
  if (!raw) return null;

  const session = JSON.parse(raw) as TimerSession | null;
  if (!session || session.phase === "done") return null;
  return session;
}

export async function loadTimerSession(): Promise<TimerSession | null> {
  try {
    const session = await readStoredSession();
    if (!session) return null;

    const reconciled = reconcileTimerSession(session);

    // Migrate legacy key → primary key.
    await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(reconciled));
    await AsyncStorage.removeItem(LEGACY_TIMER_STATE_KEY);

    return reconciled;
  } catch {
    return null;
  }
}

export async function saveTimerSession(
  session: TimerSession | null,
): Promise<void> {
  try {
    if (session === null) {
      await clearTimerSession();
      return;
    }

    const snapshot = { ...session, savedAt: Date.now() };
    await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(snapshot));
  } catch {
    // Persistence failure should not crash the timer UI.
  }
}

export async function clearTimerSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      TIMER_STATE_KEY,
      LEGACY_TIMER_STATE_KEY,
    ]);
  } catch {
    // Ignore storage errors on clear.
  }
}

// Back-compat export used by timer-session atom wiring.
export const TIMER_SESSION_STORAGE_KEY = TIMER_STATE_KEY;
