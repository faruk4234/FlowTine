import AsyncStorage from '@react-native-async-storage/async-storage';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

async function safeParseJSON<T>(raw: string | null): Promise<T | null> {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const storage = {
  async setString(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },

  async getString(key: string) {
    return await AsyncStorage.getItem(key);
  },

  async setJSON(key: string, value: JsonValue) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    return await safeParseJSON<T>(raw);
  },

  async remove(key: string) {
    await AsyncStorage.removeItem(key);
  },

  async clear() {
    await AsyncStorage.clear();
  },

  async keys() {
    return await AsyncStorage.getAllKeys();
  },
} as const;

