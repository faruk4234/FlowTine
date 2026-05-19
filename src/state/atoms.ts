import { ThemeMode } from "@/src/state/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import * as ImagePicker from "expo-image-picker";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const boolStorage = createJSONStorage<boolean>(() => AsyncStorage);
const themeStorage = createJSONStorage<ThemeMode>(() => AsyncStorage);

// ─── User-flow persistent atoms ───────────────────────────────────────────────
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  "onboarding.completed",
  false,
  boolStorage,
);
export const isPremiumAtom = atomWithStorage<boolean>(
  "paywall.isPremium",
  false,
  boolStorage,
);
export const hasSeenPaywallAtom = atomWithStorage<boolean>(
  "paywall.hasSeenPaywall",
  false,
  boolStorage,
);
export const themeModeAtom = atomWithStorage<ThemeMode>(
  "theme.mode",
  "system",
  themeStorage,
);

// ─── Transient atoms ──────────────────────────────────────────────────────────
export const sessionAtom = atom<{ startedAt: number } | null>(null);
export const selectedMediaAtom = atom<ImagePicker.ImagePickerAsset[]>([]);
