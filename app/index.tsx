import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { userAtom, hasCompletedOnboardingAtom } from '@/src/state/atoms';
import { apiService } from '@/src/services/api';
import { centrifugoService } from '@/src/services/centrifugo';
import { Colors } from '@/src/state/colors';
import { Typography } from '@/src/state/theme';

const DEVICE_ID_KEY = 'musicengine.device_id';
const OLD_DEVICE_ID_KEY = 'flowtine.device_id';

async function getOrGenerateDeviceId(): Promise<string> {
  try {
    // Check if we already persisted a device ID under new or old key
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY) || await AsyncStorage.getItem(OLD_DEVICE_ID_KEY);
    if (stored) {
      await AsyncStorage.setItem(DEVICE_ID_KEY, stored).catch(() => {});
      return stored;
    }

    let deviceId: string | null = null;
    let osBuildId: string | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Application = require('expo-application');
      if (Platform.OS === 'android') {
        deviceId = Application.androidId || null;
      } else if (Platform.OS === 'ios') {
        deviceId = await Application.getIosIdForVendorAsync();
      }
    } catch (e) {
      console.warn('expo-application native module not found, using fallback:', e);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Device = require('expo-device');
      osBuildId = Device.osBuildId || null;
    } catch (e) {
      console.warn('expo-device native module not found:', e);
    }

    if (!deviceId) {
      // Fallback if native modules don't return anything (e.g. Simulator, Web, or errors)
      deviceId = `device_${osBuildId || Math.random().toString(36).substring(2, 15)}`;
    }

    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch (e) {
    console.warn('Failed to retrieve hardware device ID, using random fallback:', e);
    const fallbackId = `fallback_${Math.random().toString(36).substring(2, 15)}`;
    return fallbackId;
  }
}

export default function Index() {
  const router = useRouter();
  const setUser = useSetAtom(userAtom);
  const hasCompletedOnboarding = useAtomValue(hasCompletedOnboardingAtom);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      try {
        const deviceId = await getOrGenerateDeviceId();
        const userData = await apiService.authenticateDevice(deviceId);
        setUser(userData);
        centrifugoService.connect();
        
        // Wait briefly for smooth transition
        setTimeout(() => {
          if (!hasCompletedOnboarding) {
            // Waterfall Check 2: Route to Onboarding Flow
            router.replace('/onboarding');
          } else if (!userData.isPremium) {
            // Waterfall Check 3: Force Subscription Paywall on start
            router.replace('/paywall');
          } else {
            // Authorized Premium User: Route to tabs
            router.replace('/tabs/home');
          }
        }, 500);
      } catch (e) {
        console.error('Authentication waterfall failed:', e);
        setErrorMsg('Unable to connect. Retrying...');
        // Fallback retry after 3 seconds
        setTimeout(initAuth, 3000);
      }
    }

    initAuth();
  }, [hasCompletedOnboarding, router, setUser]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={s.text}>{errorMsg || 'Securing connection...'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    ...Typography.bodyMedium,
    color: Colors.dark.mutedText,
    letterSpacing: 0.5,
  },
});
