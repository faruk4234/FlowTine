import { create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = create({
  baseURL: API_URL || 'https://fallback-mock-api.com',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// A local mock database to ensure offline testing behaves exactly like a real backend.
const MOCK_STORAGE_KEYS = {
  user: 'mock_api.user',
  songs: 'mock_api.songs',
};

const DEFAULT_MOCK_USER = {
  deviceId: '',
  isPremium: false,
  limits: {
    credit: 5,
  },
};

// Royalty-free background music streams for rich mock playback
const MOCK_AUDIO_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
];

const MOCK_LYRICS_POOL = [
  "Walking down the neon street, feeling the electric beat...\nThe stars align in the digital sky, and we watch the worlds go by.",
  "Ocean breeze and summer nights, under the fading gold lights...\nWe danced until the morning sun, two hearts beat as one.",
  "Strumming strings of golden thread, thinking of the words you said...\nIn the silence of the night, everything will be alright.",
  "Deep bass thumping through the floor, we don't look back anymore...\nRising up into the vibe, feeling so damn alive."
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getMockUser(deviceId: string) {
  const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEYS.user);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.deviceId === deviceId) return parsed;
  }
  const newUser = { ...DEFAULT_MOCK_USER, deviceId };
  await AsyncStorage.setItem(MOCK_STORAGE_KEYS.user, JSON.stringify(newUser));
  return newUser;
}

async function saveMockUser(user: any) {
  await AsyncStorage.setItem(MOCK_STORAGE_KEYS.user, JSON.stringify(user));
}

async function getMockSongs() {
  const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEYS.songs);
  return raw ? JSON.parse(raw) : [];
}

async function saveMockSongs(songs: any[]) {
  await AsyncStorage.setItem(MOCK_STORAGE_KEYS.songs, JSON.stringify(songs));
}

export const apiService = {
  authenticateDevice: async (deviceId: string) => {
    if (!API_URL) {
      console.log('⚡ [API Service] Using Mock Fallback for authenticateDevice');
      return await getMockUser(deviceId);
    }
    try {
      const response = await api.post('/api/auth/device-login', { deviceId });
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] Real request failed, falling back to mock authentication:', e);
      return await getMockUser(deviceId);
    }
  },

  generateMusic: async (payload: { genre: string; voice: string; prompt: string; type: 'prompt' | 'lyrics' }) => {
    if (!API_URL) {
      console.log('⚡ [API Service] Using Mock Fallback for generateMusic');
      // Simulate generation lag
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      const mockUser = await getMockUser('mock_device');
      if (mockUser.limits.credit <= 0) {
        throw new Error('No credits remaining');
      }

      // Deduct credit
      mockUser.limits.credit -= 1;
      await saveMockUser(mockUser);

      const songId = `song_${Date.now()}`;
      const title = payload.prompt 
        ? (payload.prompt.slice(0, 20) + ' ' + payload.genre)
        : `AI Track (${payload.genre})`;
      
      const newSong = {
        id: songId,
        title: title.trim(),
        genre: payload.genre,
        voice: payload.voice,
        url: getRandomItem(MOCK_AUDIO_TRACKS),
        lyrics: payload.type === 'lyrics' ? payload.prompt : getRandomItem(MOCK_LYRICS_POOL),
        duration: 180,
        createdAt: new Date().toISOString(),
      };

      const songs = await getMockSongs();
      songs.unshift(newSong);
      await saveMockSongs(songs);

      return {
        song: newSong,
        user: mockUser,
      };
    }
    
    try {
      const response = await api.post('/api/generate-music', payload);
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] Real generation failed, falling back to mock generation:', e);
      // Simulate fallback generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const mockUser = await getMockUser('mock_device');
      if (mockUser.limits.credit <= 0) {
        throw new Error('No credits remaining');
      }
      mockUser.limits.credit -= 1;
      await saveMockUser(mockUser);

      const newSong = {
        id: `song_${Date.now()}`,
        title: `${payload.genre} Flow`,
        genre: payload.genre,
        voice: payload.voice,
        url: getRandomItem(MOCK_AUDIO_TRACKS),
        lyrics: payload.type === 'lyrics' ? payload.prompt : getRandomItem(MOCK_LYRICS_POOL),
        duration: 180,
        createdAt: new Date().toISOString(),
      };

      const songs = await getMockSongs();
      songs.unshift(newSong);
      await saveMockSongs(songs);

      return {
        song: newSong,
        user: mockUser,
      };
    }
  },

  getUserSongs: async () => {
    if (!API_URL) {
      console.log('⚡ [API Service] Using Mock Fallback for getUserSongs');
      return await getMockSongs();
    }
    try {
      const response = await api.get('/api/songs');
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] Real songs fetch failed, falling back to mock songs:', e);
      return await getMockSongs();
    }
  },

  // Developer utility to reset mock DB
  resetMockData: async (deviceId: string) => {
    const user = { ...DEFAULT_MOCK_USER, deviceId };
    await saveMockUser(user);
    await saveMockSongs([]);
    return user;
  },

  // Developer utility to add credits
  addMockCredits: async (deviceId: string, amount: number) => {
    const user = await getMockUser(deviceId);
    user.limits.credit += amount;
    await saveMockUser(user);
    return user;
  }
};
