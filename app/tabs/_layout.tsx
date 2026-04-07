import { Tabs } from 'expo-router';
import React from 'react';

import { useAppTheme } from '@/src/providers/app-theme-provider';
import { Colors } from '@/src/state/colors';

const TabsLayout = () => {
  const { scheme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[scheme].tabBarActive,
        tabBarInactiveTintColor: Colors[scheme].tabBarInactive,
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />

    </Tabs>
  );
}

export default TabsLayout;