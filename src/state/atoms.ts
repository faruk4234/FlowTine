import { ThemeMode } from '@/src/state/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

const persistentStorage = createJSONStorage<boolean>(() => AsyncStorage);

/**
 * Example: persistent local atoms (AsyncStorage-backed).
 * Use this pattern heavily for local-first apps.
 */
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboarding.completed',
  false,
  persistentStorage
);
export const themeModeAtom = atomWithStorage<ThemeMode>('theme.mode', 'system', createJSONStorage<ThemeMode>(() => AsyncStorage));

/**
 * Example: transient atoms.
 */
export const sessionAtom = atom<{ startedAt: number } | null>(null);

