import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/state/theme';
import AudioPlayer from '@/src/components/AudioPlayer';

export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <View style={s.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.tabBarActive,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: 'rgba(14, 22, 19, 0.92)',
            borderTopColor: 'rgba(26, 37, 32, 0.5)',
            borderTopWidth: 1.2,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Create',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'musical-notes' : 'musical-notes-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="lyrics"
          options={{
            title: 'Lyrics',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'leaf' : 'leaf-outline'} size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarBadge: 2,
            tabBarBadgeStyle: {
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '700',
              lineHeight: 14,
            },
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'library' : 'library-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <AudioPlayer />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
});