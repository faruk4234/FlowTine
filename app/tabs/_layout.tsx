import { Stack } from 'expo-router';

const TabsLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="home" />
  </Stack>
);

export default TabsLayout;