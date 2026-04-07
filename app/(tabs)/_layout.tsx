import { Tabs } from 'expo-router';
import React from 'react';

import { useAppTheme } from '@/src/providers/app-theme-provider';
import { Colors } from '@/src/state/colors';

export default function TabLayout() {
  const { scheme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[scheme].tabBarActive,
        tabBarInactiveTintColor: Colors[scheme].tabBarInactive,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home2',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
    </Tabs>
  );
}
