import { ThemeMode } from "@/src/state/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const boolStorage = createJSONStorage<boolean>(() => AsyncStorage);
const themeStorage = createJSONStorage<ThemeMode>(() => AsyncStorage);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserState {
  deviceId: string;
  isPremium: boolean;
  limits: {
    credit: number;
  };
}

export interface SavedLyrics {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

// ─── Persistent & Global Atoms ────────────────────────────────────────────────
export const userAtom = atom<UserState | null>(null);

export const hasCompletedOnboardingAtom = atomWithStorage<boolean>(
  "onboarding.completed",
  false,
  boolStorage,
);

export const themeModeAtom = atomWithStorage<ThemeMode>(
  "theme.mode",
  "dark",
  themeStorage,
);

// ─── Selection Atoms ─────────────────────────────────────────────────────────
export const selectedGenreAtom = atom<string>('');
export const selectedVoiceAtom = atom<'male' | 'female' | 'instrumental' | ''>('');
export const selectedMoodAtom = atom<string>('');
export const promptOrLyricsTypeAtom = atom<'prompt' | 'lyrics'>('prompt');
export const textInputAtom = atom<string>('');

// ─── Saved Lyrics (Local Storage) ─────────────────────────────────────────────
const savedLyricsStorage = createJSONStorage<SavedLyrics[]>(() => AsyncStorage);
export const savedLyricsAtom = atomWithStorage<SavedLyrics[]>(
  "lyrics.saved",
  [],
  savedLyricsStorage,
);

// ─── Shared Audio Player Atoms ───────────────────────────────────────────────
export const editingLyricAtom = atom<SavedLyrics | null>(null);
export interface Track {
  id: string;
  title: string;
  url: string;
  lyrics?: string;
  duration: number;
  genre?: string;
  voice?: string;
}

export const activeTrackAtom = atom<Track | null>(null);
export const isPlayingAtom = atom<boolean>(false);

// ─── Compatibility derived atom for app/_layout.tsx RevenueCat sync ──────────
export const isPremiumAtom = atom<boolean>(
  (get) => {
    const user = get(userAtom);
    return user ? user.isPremium : false;
  },
  (get, set, update: boolean) => {
    const user = get(userAtom);
    if (user) {
      set(userAtom, { ...user, isPremium: update });
    } else {
      set(userAtom, { deviceId: 'temp_device', isPremium: update, limits: { credit: update ? 100 : 0 } });
    }
  }
);
