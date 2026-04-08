import { Stack } from 'expo-router';

const TabsLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="home" />
    <Stack.Screen name="routine" options={{ animation: 'slide_from_right' }} />
    <Stack.Screen name="timer"   options={{ animation: 'slide_from_bottom' }} />
  </Stack>
);

export default TabsLayout;