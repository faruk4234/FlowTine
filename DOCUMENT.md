# Product Specification & Architecture Blueprint: AI Music Generator Mobile App

## 1. System Constraints & Refactoring Rules
You are an expert React Native, Expo, and TypeScript developer. Your task is to refactor and extend the existing project based on the following rules:
- **Clean Code:** Scan the current codebase and aggressively **DELETE** all unused screens, assets, utilities, and components that are not related to this new AI Music application.
- **State Management:** Jotai (Atom-based state management). Maintain existing core configuration but inject the new atoms specified below.
- **Styling:** Strictly enforce the use of the existing `colors.ts` theme file. **DO NOT hardcode hex values** (#FFF, #000 etc.) anywhere in new components. Use colors.background, colors.primary, etc.
- **Navigation:** Expo Router (File-based navigation) with a persistent Bottom Tab Bar layout.

---

## 2. Authentication & Data Structure (Jotai Atoms)
The application authenticates users silently using their unique Hardware Device ID (deviceId). Update or create the global user atoms to map exactly to this data structure:

import { atom } from 'jotai';

export interface UserState {
  deviceId: string;
  isPremium: boolean;
  limits: {
    credit: number;
  };
}

export const userAtom = atom<UserState | null>(null);
export const hasCompletedOnboardingAtom = atom<boolean>(false);

export const selectedGenreAtom = atom<string>('');
export const selectedVoiceAtom = atom<'male' | 'female' | 'instrumental' | ''>('');
export const selectedMoodAtom = atom<string>('');
export const promptOrLyricsTypeAtom = atom<'prompt' | 'lyrics'>('prompt');
export const textInputAtom = atom<string>('');

export interface SavedLyrics {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}
export const savedLyricsAtom = atom<SavedLyrics[]>([]);

---

## 3. App Launch, Authentication & Paywall Interceptors
On application mounting, implement the following waterfall guard checks:

1. **Silent Login:** Fetch the hardware `deviceId` using `expo-device` / `expo-application`. Authenticate via Axios to get the `user` object. Populate `userAtom`.
2. **Onboarding Check:** If `hasCompletedOnboardingAtom` is `false` -> Route to **Onboarding Flow** -> Then force **Premium Paywall**.
3. **App Start Paywall (Paywall 1):** If the user is a returning user and `user.isPremium` is `false`, immediately intercept the routing lifecycle and display the full-screen **Subscription Paywall**. Block access to the main tabs.
4. **Credit Check Paywall (Paywall 2):** Before triggering the song generation API workflow, verify `user.limits.credit`. If `user.limits.credit <= 0`, intercept the action and display the **Credit Top-Up Paywall**.

---

## 4. UI Layout & Bottom Tab Navigation

Implement a persistent Bottom Tab Bar with 4 core tabs using Expo Router:

### ── TAB 1: CREATE (HOME SCREEN) ──
The generation studio dashboard.
- **Genre Grid:** Horizontal or vertical list of music genres. Pressing an option updates `selectedGenreAtom`.
- **Voice Selector:** Toggle buttons for: `Male`, `Female`, and `Instrumental`.
- **"Surprise Me" Button:** Triggers a randomizer function that picks a random genre, voice, and mood/vibe, instantly updating the corresponding Jotai atoms.
- **Mood & Vibe Picker:** Visual chips displaying current or randomized emotional vibes.
- **Input Toggle:** Segmented button to switch between `Prompt` and `Lyrics`.
- **Dynamic Text Area:** Large TextInput binding to `textInputAtom` for manual inputs.
- **Generate Song Button:** Evaluates `user.limits.credit` first. If > 0, executes the creation workflow.

### ── TAB 2: LYRICS (LOCAL STORAGE) ──
- Lists locally created and saved lyrics from `savedLyricsAtom`.
- **"Generate Song from this Lyrics" Button:** Clicking this element copies the lyric content into `textInputAtom`, toggles `promptOrLyricsTypeAtom` to `'lyrics'`, and auto-navigates the UI back to the **Create (Home)** tab with fields populated.

### ── TAB 3: LIBRARY (TOP TAB LAYOUT) ──
Features a Native Top Tab Navigator breaking into two lists:
1. **Songs Tab (API Driven):** Performs an Axios fetch to retrieve and list the user's generated music tracks (`.mp3` / `.mp4`).
2. **Lyrics Tab (Local Driven):** A synchronized layout displaying the saved lyrics rows from local storage.

### ── TAB 4: PROFILE SCREEN ──
User management list:
- Displays active subscription tier (`user.isPremium`) and live credits count (`user.limits.credit`).
- Buttons to trigger: **Buy Credits** / **Go Premium** (Deep links to respective paywalls).
- App actions: Terms of Service, Privacy Policy, Contact Support, Rate Us, and **Restore Purchase** button.

---

## 5. Audio Player Component & Visualizer Animation
When a user plays a song from the Library or Generation completion screen, render a stylized **Audio Player Interface**:
- Integrate `expo-audio` or `expo-av` for background audio streaming and playback states (Play, Pause, Progress Seek bar).
- **Audio Waveform Animation:** Implement an active looping visualizer animation (using `react-native-reanimated` or `moti`) that triggers scale/height scaling transitions on visual bars *only* while the audio playback state is actively running. Stop the animation gracefully when paused or ended.

---

## 6. Axios API Service Configuration
Centralize network requests in a single abstraction layer utilizing the project's existing structure.

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const apiService = {
  authenticateDevice: async (deviceId: string) => {
    const response = await api.post('/api/auth/device-login', { deviceId });
    return response.data;
  },
  generateMusic: async (payload: { genre: string; voice: string; prompt: string; type: 'prompt' | 'lyrics' }) => {
    const response = await api.post('/api/generate-music', payload);
    return response.data;
  },
  getUserSongs: async () => {
    const response = await api.get('/api/songs');
    return response.data;
  }
};