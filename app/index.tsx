import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { apiService } from '@/src/services/api';
import { centrifugoService } from '@/src/services/centrifugo';
import { hasCompletedOnboardingAtom, userAtom } from '@/src/state/atoms';
import { Colors } from '@/src/state/colors';
import { Typography } from '@/src/state/theme';

import * as Application from 'expo-application';
import * as Device from 'expo-device';

const DEVICE_ID_KEY = 'musicengine.device_id';
const OLD_DEVICE_ID_KEY = 'flowtine.device_id';

async function getOrGenerateDeviceId(): Promise<string> {
  try {
    // Check if we already persisted a device ID under new or old key
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY) || await AsyncStorage.getItem(OLD_DEVICE_ID_KEY);
    if (stored) {
      await AsyncStorage.setItem(DEVICE_ID_KEY, stored).catch(() => { });
      return stored;
    }

    let deviceId: string | null = null;

    try {
      if (Platform.OS === 'android') {
        deviceId = Application.getAndroidId() || Application.androidId || null;
      } else if (Platform.OS === 'ios') {
        deviceId = await Application.getIosIdForVendorAsync();
      }
    } catch (e) {
      console.warn('Hardware ID retrieval error:', e);
    }

    if (!deviceId) {
      // Deterministic fallback using constant device properties instead of random strings
      const stableSeed = `${Device.modelName || 'device'}_${Device.osBuildId || 'build'}_${Device.totalMemory || 'mem'}`;
      deviceId = `dev_${stableSeed.replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId).catch(() => { });
    return deviceId;
  } catch (e) {
    console.warn('Failed to retrieve hardware device ID:', e);
    return 'fallback_stable_device';
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

        const storedOnboarding = await AsyncStorage.getItem("onboarding.completed");
        const isOnboardingDone = storedOnboarding === "true";

        // Wait briefly for smooth transition
        setTimeout(() => {
          if (!isOnboardingDone) {
            // Waterfall Check 2: Route to Onboarding Flow
            router.replace('/onboarding');
          } else if (!userData.isPremium) {
            // Waterfall Check 3: Force Subscription Paywall on start
            router.replace('/paywall');
          } else {
            // Authorized Premium User: Route to tabs
            router.replace('/tabs/home');
          }
        }, 400);
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
