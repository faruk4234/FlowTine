import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'axios';
import { Platform } from 'react-native';

// Reads EXPO_PUBLIC_API_URL from .env file, falls back to localhost:8080
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

const api = create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    AsyncStorage.setItem('api_token', token).catch(() => { });
  } else {
    delete api.defaults.headers.common['Authorization'];
    AsyncStorage.removeItem('api_token').catch(() => { });
  }
}

// Interceptor to load stored token if not in memory
api.interceptors.request.use(async (config) => {
  if (!currentToken) {
    try {
      const savedToken = await AsyncStorage.getItem('api_token');
      if (savedToken) {
        currentToken = savedToken;
        config.headers.Authorization = `Bearer ${savedToken}`;
      }
    } catch (e) { }
  } else if (!config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// ─── Local Mock Storage (Fallback for offline/dev) ──────────────────────────
const MOCK_STORAGE_KEYS = {
  user: 'mock_api.user',
  songs: 'mock_api.songs',
};

const DEFAULT_MOCK_USER = {
  _id: '6a462ef8db75df2c904617a6',
  deviceId: '',
  isPremium: false,
  isAdmin: false,
  platform: 'unknown',
  createdAt: '2026-07-02T09:27:20.345Z',
  updatedAt: '2026-07-02T09:27:20.345Z',
  limits: {
    premiumCredit: 0,
    credit: 5,
    rewardAdCount: 10,
    watchAdCount: 0,
  },
};

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

function getCountryCode(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const parts = locale.split(/[-_]/);
    if (parts.length > 1 && parts[1].length === 2) {
      return parts[1].toLowerCase(); // e.g., 'tr', 'ru', 'us'
    }
    if (parts.length === 1 && parts[0].length === 2) {
      return parts[0].toLowerCase(); // e.g., 'tr', 'ru'
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Istanbul')) return 'tr';
    if (tz.includes('Moscow')) return 'ru';
  } catch (e) { }
  return 'us';
}

function getAppVersion(): number {
  if (Platform.OS === 'ios') {
    const raw = process.env.EXPO_PUBLIC_IOSVERSION || process.env.IOSVERSION;
    const num = Number(raw);
    return !isNaN(num) && num > 0 ? num : 1;
  }
  if (Platform.OS === 'android') {
    const raw = process.env.EXPO_PUBLIC_ANDROIDVERSION || process.env.ANDROIDVERSION;
    const num = Number(raw);
    return !isNaN(num) && num > 0 ? num : 1;
  }
  return 1;
}

async function getMockUser(deviceId: string) {
  const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEYS.user);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.deviceId === deviceId) return parsed;
  }
  const platform = Platform.OS;
  const version = getAppVersion();
  const country = getCountryCode();
  const newUser = { ...DEFAULT_MOCK_USER, deviceId, platform, version, country };
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

// ─── 13 Endpoints matching aimusic.json Postman Collection ──────────────────
export const apiService = {
  // 1. Auth: Login / Register by Device ID (POST /auth/login)
  authenticateDevice: async (deviceId: string) => {
    try {
      const platform = Platform.OS;
      const version = getAppVersion();
      const country = getCountryCode();
      console.log(`🔑 [Auth] Authenticating device with info:`, { deviceId, platform, version, country });
      const response = await api.post('/auth/login', { deviceId, platform, version, country });
      const data = response.data;
      const token = data.access_token || data.token || data.jwt;
      if (token) {
        setAuthToken(token);
      }
      return data.user || data;
    } catch (e) {
      console.warn('⚠️ [API Service] /auth/login failed, falling back to mock authentication:', e);
      return await getMockUser(deviceId);
    }
  },

  // 2. Users: Get My Profile (GET /users/me)
  getMyProfile: async () => {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /users/me failed, falling back to mock profile:', e);
      return await getMockUser('mock_device');
    }
  },

  // 3. Users: get socket token (GET /users/socket)
  getSocketToken: async () => {
    try {
      const response = await api.get('/users/socket');
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /users/socket failed, offline/mock mode:', e);
      return null;
    }
  },

  // 4. Users: Update Profile (PUT /users/update)
  updateProfile: async (payload: { platform?: string; country?: string; version?: number }) => {
    try {
      const response = await api.put('/users/update', payload);
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /users/update failed:', e);
      const user = await getMockUser('mock_device');
      const updated = { ...user, ...payload };
      await saveMockUser(updated);
      return updated;
    }
  },

  // 5. AppConfig: Get Public Configs (GET /app-config/public)
  getPublicConfig: async () => {
    try {
      const response = await api.get('/app-config/public');
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /app-config/public failed, returning default config:', e);
      return { features: { generationEnabled: true, creditPrice: 1.99 } };
    }
  },

  // 6 & 7. Music: Create Music From Prompt / Lyrics (POST /music/create)
  generateMusic: async (payload: { genre: string; voice: string; prompt: string; type: 'prompt' | 'lyrics'; title?: string }) => {
    try {
      const body = {
        input: payload.prompt,
        type: payload.type === 'lyrics' ? 'lycris' : 'prompt', // Match backend schema: "prompt" | "lycris"
        genre: payload.genre,
        voice: payload.voice,
        title: payload.title || `AI Track (${payload.genre})`,
      };
      const response = await api.post('/music/create', body);
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /music/create failed, falling back to mock generation:', e);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockUser = await getMockUser('mock_device');
      if (mockUser.limits.credit <= 0 && (!mockUser.limits.premiumCredit || mockUser.limits.premiumCredit <= 0)) {
        throw new Error('No credit remaining...');
      }

      if (mockUser.limits.premiumCredit && mockUser.limits.premiumCredit > 0) {
        mockUser.limits.premiumCredit -= 1;
      } else {
        mockUser.limits.credit -= 1;
      }
      await saveMockUser(mockUser);

      const songId = `song_${Date.now()}`;
      const title = payload.title || (payload.prompt ? payload.prompt.slice(0, 20) + ' ' + payload.genre : `AI Track (${payload.genre})`);

      const newSong = {
        id: songId,
        title: title.trim(),
        genre: payload.genre,
        voice: payload.voice,
        url: getRandomItem(MOCK_AUDIO_TRACKS),
        lyrics: payload.type === 'lyrics' ? payload.prompt : getRandomItem(MOCK_LYRICS_POOL),
        duration: 180,
        status: 'done',
        createdAt: new Date().toISOString(),
      };

      const songs = await getMockSongs();
      songs.unshift(newSong);
      await saveMockSongs(songs);

      // Trigger mock centrifugo event after 3 seconds for offline testing
      setTimeout(() => {
        import('./centrifugo').then((m) => {
          m.centrifugoService.simulateMusicReady(newSong);
        }).catch(() => { });
      }, 3000);

      return {
        song: newSong,
        user: mockUser,
      };
    }
  },

  // 8. Music: Get My Music Tracks (GET /music)
  getUserSongs: async () => {
    try {
      const response = await api.get('/music');
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /music GET failed, falling back to mock songs:', e);
      return await getMockSongs();
    }
  },

  // 9. Music: Delete Music Track (DELETE /music/:id)
  deleteSong: async (id: string) => {
    try {
      const response = await api.delete(`/music/${id}`);
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] /music DELETE failed, soft-deleting locally:', e);
      const songs = await getMockSongs();
      const filtered = songs.filter((s: any) => s.id !== id && s._id !== id);
      await saveMockSongs(filtered);
      return { success: true };
    }
  },

  // 10. Payments: Create / Validate Subscription Purchase (POST /payments/create)
  createSubscriptionPurchase: async (payload: { platform: string; sku?: string; packageName?: string; purchaseToken?: string; transactionId?: string }) => {
    console.log('🚀 [API Service] POST /payments/create - Request payload:', JSON.stringify(payload, null, 2));
    try {
      const response = await api.post('/payments/create', payload);
      console.log('✅ [API Service] POST /payments/create - Success response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (e: any) {
      console.error('❌ [API Service] POST /payments/create - Error status:', e?.response?.status);
      console.error('❌ [API Service] POST /payments/create - Error data:', JSON.stringify(e?.response?.data || e?.message, null, 2));
      return {
        success: false,
        error: e?.response?.data?.message || e?.response?.data?.error || e?.message || "Could not verify subscription with server.",
      };
    }
  },

  // 11. Payments: Restore Subscription Purchase (POST /payments/restore)
  restoreSubscriptionPurchase: async (payload: { platform: string; sku?: string; packageName?: string; transactionId?: string; purchaseToken?: string }) => {
    console.log('🚀 [API Service] POST /payments/restore - Request payload:', JSON.stringify(payload, null, 2));
    try {
      const response = await api.post('/payments/restore', payload);
      console.log('✅ [API Service] POST /payments/restore - Success response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (e: any) {
      console.error('❌ [API Service] POST /payments/restore - Error status:', e?.response?.status);
      console.error('❌ [API Service] POST /payments/restore - Error data:', JSON.stringify(e?.response?.data || e?.message, null, 2));
      return {
        success: false,
        error: e?.response?.data?.message || e?.response?.data?.error || e?.message || "Could not verify restored subscription with server.",
      };
    }
  },

  // 12. Payments: Consume One-Time Credit Package (POST /payments/one-time)
  consumeOneTimeCredit: async (payload: { platform: string; sku: string; packageName?: string; purchaseToken?: string; transactionId?: string; credits?: number }) => {
    console.log('🚀 [API Service] POST /payments/one-time - Request payload:', JSON.stringify(payload, null, 2));
    try {
      const response = await api.post('/payments/one-time', payload);
      console.log('✅ [API Service] POST /payments/one-time - Success response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (e: any) {
      console.error('❌ [API Service] POST /payments/one-time - Error status:', e?.response?.status);
      console.error('❌ [API Service] POST /payments/one-time - Error data:', JSON.stringify(e?.response?.data || e?.message, null, 2));
      return {
        success: false,
        error: e?.response?.data?.message || e?.response?.data?.error || e?.message || "Could not verify credit purchase with server.",
      };
    }
  },

  // 13. General: Health Check (GET /)
  healthCheck: async () => {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (e) {
      console.warn('⚠️ [API Service] Health check failed:', e);
      return 'Hello World! (Mock Offline)';
    }
  },

  // ─── Dev utilities ────────────────────────────────────────────────────────
  resetMockData: async (deviceId: string) => {
    const user = { ...DEFAULT_MOCK_USER, deviceId };
    await saveMockUser(user);
    await saveMockSongs([]);
    return user;
  },

  addMockCredits: async (deviceId: string, amount: number) => {
    const user = await getMockUser(deviceId);
    user.limits.credit += amount;
    await saveMockUser(user);
    return user;
  },

  activateMockWeeklyPremium: async (deviceId: string) => {
    const user = await getMockUser(deviceId);
    user.isPremium = true;
    user.limits.credit = (user.limits.credit || 0) + 10;
    await saveMockUser(user);
    return user;
  }
};

