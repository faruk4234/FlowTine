import AsyncStorage from "@react-native-async-storage/async-storage";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { Movement } from "./atoms";

export type TimerPhase = "work" | "rest" | "done";

export type TimerSession = {
  routineId: string;
  movIdx: number;
  currentRepeat: number;
  phase: TimerPhase;
  seconds: number;
  isRunning: boolean;
  segmentEndsAtMs: number | null;
};

export const timerSessionAtom = atomWithStorage<TimerSession | null>(
  "timer.session",
  null,
  createJSONStorage<TimerSession | null>(() => AsyncStorage),
);

export function movementWorkSeconds(m: Movement | null | undefined): number {
  if (!m) return 0;
  return m.durationMin * 60 + m.durationSec;
}

export function getActiveRoutineId(
  session: TimerSession | null | undefined,
): string | null {
  if (!session || session.phase === "done") return null;
  return session.routineId;
}

export function createFreshTimerSession(
  routineId: string,
  movements: Movement[],
): TimerSession {
  const first = movements[0];
  const seconds = first ? movementWorkSeconds(first) : 0;
  const now = Date.now();
  return {
    routineId,
    movIdx: 0,
    currentRepeat: 1,
    phase: "work",
    seconds,
    isRunning: true,
    segmentEndsAtMs: seconds > 0 ? now + seconds * 1000 : null,
  };
}

export function formatMovementStep(movIdx: number): string {
  return String(movIdx + 1).padStart(2, "0");
}
