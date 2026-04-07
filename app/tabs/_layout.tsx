import { Tabs } from 'expo-router';
import React from 'react';

import { useAppTheme } from '@/src/providers/app-theme-provider';
import { Colors } from '@/src/state/colors';

const TabsLayout = () => {
  const { scheme } = useAppTheme();

  // Put your real condition here (atom, storage, etc.)
  const showHomeCopy = true;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[scheme].tabBarActive,
        tabBarInactiveTintColor: Colors[scheme].tabBarInactive,
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="home-copy" options={showHomeCopy ? { title: 'Home2 Copy' } : { href: null }} />
    </Tabs>
  );
};

export default TabsLayout;