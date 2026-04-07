import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import 'react-native-reanimated';

import { AppThemeProvider } from '@/src/providers/app-theme-provider';

const RootLayout = () => {
  return (
    <JotaiProvider>
      <AppThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen  name='tabs' />
        </Stack>
      </AppThemeProvider>
    </JotaiProvider>
  );
}

export default RootLayout;