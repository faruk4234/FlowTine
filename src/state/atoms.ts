import { ThemeMode } from '@/src/state/colors';
import { appStore } from '@/src/state/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

// ─── Storage helpers ──────────────────────────────────────────────────────────
const boolStorage = createJSONStorage<boolean>(() => AsyncStorage);
const themeStorage = createJSONStorage<ThemeMode>(() => AsyncStorage);

// ─── Types ────────────────────────────────────────────────────────────────────
export type CategoryIcon = {
  name: string;     // Ionicons icon name
  label: string;    // display label
  color: string;    // accent color
  bgColor: string;  // tinted background (20 % opacity)
};

export const CATEGORY_ICONS: CategoryIcon[] = [
  { name: 'body', label: 'Yoga', color: '#F97316', bgColor: 'rgba(249,115,22,0.15)' },
  { name: 'barbell', label: 'Strength', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
  { name: 'flame', label: 'HIIT', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' },
  { name: 'bicycle', label: 'Cardio', color: '#22C55E', bgColor: 'rgba(34,197,94,0.15)' },
  { name: 'fitness', label: 'Fitness', color: '#A855F7', bgColor: 'rgba(168,85,247,0.15)' },
  { name: 'timer', label: 'Focus', color: '#38BDF8', bgColor: 'rgba(56,189,248,0.15)' },
  { name: 'moon', label: 'Sleep', color: '#818CF8', bgColor: 'rgba(129,140,248,0.15)' },
  { name: 'heart', label: 'Health', color: '#F43F5E', bgColor: 'rgba(244,63,94,0.15)' },
  { name: 'walk', label: 'Walk', color: '#84CC16', bgColor: 'rgba(132,204,22,0.15)' },
  { name: 'water', label: 'Hydration', color: '#06B6D4', bgColor: 'rgba(6,182,212,0.15)' },
];

/** A single movement / task inside a routine. */
export type Movement = {
  id: string;
  name: string;
  description: string;
  durationMin: number;  // work time minutes
  durationSec: number;  // work time seconds
  restSec: number;      // rest between intervals (seconds)
};

export type Routine = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;        // total minutes
  movementCount: number;      // kept in sync with movements.length
  categoryIconIndex: number;  // index into CATEGORY_ICONS
  isActive: boolean;
  createdAt: number;
  movements: Movement[];
};

// ─── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_ROUTINES: Routine[] = [
  /* {
     id: 'default-1',
     title: 'Morning Yoga',
     subtitle: 'Vinyasa Flow focus',
     durationMin: 15,
     movementCount: 3,
     categoryIconIndex: 0,
     isActive: true,
     createdAt: 1_000_000_001,
     movements: [
       { id: 'm1-1', name: 'Sun Salutation A', description: '', durationMin: 5, durationSec: 0, restSec: 30 },
       { id: 'm1-2', name: 'Deep Breath Isometric', description: '', durationMin: 2, durationSec: 0, restSec: 15 },
       { id: 'm1-3', name: 'Warrior Flow II', description: '', durationMin: 8, durationSec: 0, restSec: 60 },
     ],
   },*/
  {
    id: 'default-2',
    title: 'Deep Work Pomodoro',
    subtitle: '4 cycles • Focus blocks',
    durationMin: 50,
    movementCount: 4,
    categoryIconIndex: 5,
    isActive: false,
    createdAt: 1_000_000_002,
    movements: [
      { id: 'm2-1', name: 'Focus Block 1', description: 'No distractions', durationMin: 25, durationSec: 0, restSec: 300 },
      { id: 'm2-2', name: 'Focus Block 2', description: '', durationMin: 25, durationSec: 0, restSec: 300 },
    ],
  },
  {
    id: 'default-3',
    title: 'Quick HIIT',
    subtitle: 'Full body • Intensity focus',
    durationMin: 12,
    movementCount: 3,
    categoryIconIndex: 2,
    isActive: false,
    createdAt: 1_000_000_003,
    movements: [
      { id: 'm3-1', name: 'Burpees', description: 'Full body explosive', durationMin: 0, durationSec: 40, restSec: 20 },
      { id: 'm3-2', name: 'Jump Squats', description: '', durationMin: 0, durationSec: 40, restSec: 20 },
      { id: 'm3-3', name: 'Mountain Climbers', description: '', durationMin: 0, durationSec: 40, restSec: 20 },
    ],
  },
];

// ─── Persistent atoms ─────────────────────────────────────────────────────────

/** All saved routines, persisted to AsyncStorage. */
export const routinesAtom = atomWithStorage<Routine[]>(
  'routines.list',
  DEFAULT_ROUTINES,
  createJSONStorage<Routine[]>(() => AsyncStorage),
);

/**
 * Set of default routine IDs the user has explicitly deleted.
 * Used by seedDefaultRoutines() to avoid re-adding them on next launch.
 */
export const deletedDefaultIdsAtom = atomWithStorage<string[]>(
  'routines.deletedDefaults',
  [],
  createJSONStorage<string[]>(() => AsyncStorage),
);

/**
 * Call once at app startup (e.g. in _layout.tsx or index.tsx).
 * Merges any new DEFAULT_ROUTINES into storage, skipping ones the user deleted.
 */
export async function seedDefaultRoutines(): Promise<void> {
  try {
    const [storedRaw, deletedRaw] = await Promise.all([
      AsyncStorage.getItem('routines.list'),
      AsyncStorage.getItem('routines.deletedDefaults'),
    ]);

    const stored: Routine[] = storedRaw ? JSON.parse(storedRaw) : [];
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

    const storedIds = new Set(stored.map((r) => r.id));

    // Find defaults the user hasn't seen yet and hasn't explicitly deleted
    const toAdd = DEFAULT_ROUTINES.filter(
      (d) => !storedIds.has(d.id) && !deletedIds.includes(d.id),
    );

    if (toAdd.length === 0) return;

    const merged = [...stored, ...toAdd];
    // CRITICAL: We must update the atom, not just AsyncStorage.
    // appStore.set ensures the React state is updated immediately so no routines 'disappear'.
    appStore.set(routinesAtom, merged);
  } catch (e) {
    console.warn('[seedDefaultRoutines] failed:', e);
  }
}

/** ID of the routine detail screen currently open. Transient. */
export const selectedRoutineIdAtom = atom<string | null>(null);

/** ID of the currently running routine (null = none). Transient. */
export const activeRoutineIdAtom = atom<string | null>(null);

/** Timer state: seconds remaining while a routine is running. Transient. */
export const timerSecondsAtom = atom<number>(0);
export const timerRunningAtom = atom<boolean>(false);

// ─── User-flow persistent atoms ───────────────────────────────────────────────
export const onboardingCompletedAtom = atomWithStorage<boolean>('onboarding.completed', false, boolStorage);
export const isPremiumAtom = atomWithStorage<boolean>('paywall.isPremium', false, boolStorage);
export const hasSeenPaywallAtom = atomWithStorage<boolean>('paywall.hasSeenPaywall', false, boolStorage);
export const themeModeAtom = atomWithStorage<ThemeMode>('theme.mode', 'system', themeStorage);

// ─── App Settings Atoms ───────────────────────────────────────────────────────
export const notificationsEnabledAtom = atomWithStorage<boolean>('settings.notifications', true, boolStorage);
export const soundVibrationEnabledAtom = atomWithStorage<boolean>('settings.soundVibration', true, boolStorage);
export const autoAdvanceEnabledAtom = atomWithStorage<boolean>('settings.autoAdvance', false, boolStorage);
export const countdownSoundEnabledAtom = atomWithStorage<boolean>('settings.countdownSound', true, boolStorage);
/** Routine timer cue tones (get ready, go, step done, all done). Haptics stay on when this is off. */
export const routineCueSoundsEnabledAtom = atomWithStorage<boolean>('settings.routineCueSounds', true, boolStorage);

// ─── Transient atoms ──────────────────────────────────────────────────────────
export const sessionAtom = atom<{ startedAt: number } | null>(null);
