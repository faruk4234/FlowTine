import { ThemeMode } from '@/src/state/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

// ─── Storage helpers ──────────────────────────────────────────────────────────
const boolStorage = createJSONStorage<boolean>(() => AsyncStorage);
const themeStorage = createJSONStorage<ThemeMode>(() => AsyncStorage);

// ─── Types ────────────────────────────────────────────────────────────────────
export type CategoryIcon = {
  name: string;           // Ionicons icon name
  label: string;          // display label
  color: string;          // accent color
  bgColor: string;        // tinted background color (20% opacity)
};

export const CATEGORY_ICONS: CategoryIcon[] = [
  { name: 'body',          label: 'Yoga',        color: '#F97316', bgColor: '#F9731620' },
  { name: 'barbell',       label: 'Strength',    color: '#3B82F6', bgColor: '#3B82F620' },
  { name: 'flame',         label: 'HIIT',        color: '#EF4444', bgColor: '#EF444420' },
  { name: 'bicycle',       label: 'Cardio',      color: '#22C55E', bgColor: '#22C55E20' },
  { name: 'fitness',       label: 'Fitness',     color: '#A855F7', bgColor: '#A855F720' },
  { name: 'timer',         label: 'Focus',       color: '#38BDF8', bgColor: '#38BDF820' },
  { name: 'moon',          label: 'Sleep',       color: '#818CF8', bgColor: '#818CF820' },
  { name: 'heart',         label: 'Health',      color: '#F43F5E', bgColor: '#F43F5E20' },
  { name: 'walk',          label: 'Walk',        color: '#84CC16', bgColor: '#84CC1620' },
  { name: 'water',         label: 'Hydration',   color: '#06B6D4', bgColor: '#06B6D420' },
];

export type Routine = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;         // total minutes
  movementCount: number;
  categoryIconIndex: number;   // index into CATEGORY_ICONS
  isActive: boolean;
  createdAt: number;
};

// ─── Persistent atoms ─────────────────────────────────────────────────────────

/**
 * All saved routines, persisted to AsyncStorage.
 */
export const routinesAtom = atomWithStorage<Routine[]>(
  'routines.list',
  [
    {
      id: 'default-1',
      title: 'Morning Yoga',
      subtitle: 'Vinyasa Flow focus',
      durationMin: 15,
      movementCount: 12,
      categoryIconIndex: 0,   // Yoga / orange
      isActive: true,
      createdAt: Date.now(),
    },
    {
      id: 'default-2',
      title: 'Deep Work Pomodoro',
      subtitle: '4 cycles • Focus blocks',
      durationMin: 50,
      movementCount: 4,
      categoryIconIndex: 5,   // Focus / blue
      isActive: false,
      createdAt: Date.now(),
    },
    {
      id: 'default-3',
      title: 'Quick HIIT',
      subtitle: 'Full body • Intensity focus',
      durationMin: 12,
      movementCount: 8,
      categoryIconIndex: 2,   // HIIT / red
      isActive: false,
      createdAt: Date.now(),
    },
  ],
  createJSONStorage<Routine[]>(() => AsyncStorage)
);

/**
 * ID of the currently running routine (null = none).
 * Transient — not persisted across restarts.
 */
export const activeRoutineIdAtom = atom<string | null>(null);

/**
 * ID of the routine being viewed/built.
 */
export const selectedRoutineIdAtom = atom<string | null>(null);

// ─── User-flow persistent atoms ───────────────────────────────────────────────
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboarding.completed',
  false,
  boolStorage
);

export const isPremiumAtom = atomWithStorage<boolean>(
  'paywall.isPremium',
  false,
  boolStorage
);

export const hasSeenPaywallAtom = atomWithStorage<boolean>(
  'paywall.hasSeenPaywall',
  false,
  boolStorage
);

export const themeModeAtom = atomWithStorage<ThemeMode>(
  'theme.mode',
  'system',
  themeStorage
);

// ─── Transient atoms ──────────────────────────────────────────────────────────
export const sessionAtom = atom<{ startedAt: number } | null>(null);
