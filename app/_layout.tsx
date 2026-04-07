import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider } from 'jotai';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/src/providers/app-theme-provider';
import { Colors } from '@/src/state/colors';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationThemeProvider({ children }: { children: React.ReactNode }) {
  const { scheme } = useAppTheme();

  return (
    <ThemeProvider
      value={{
        ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
          ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
          background: Colors[scheme].background,
          card: Colors[scheme].card,
          border: Colors[scheme].border,
          text: Colors[scheme].text,
          primary: Colors[scheme].primary,
        },
      }}>
      {children}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <JotaiProvider >
      <AppThemeProvider>
        <NavigationThemeProvider>
          <Stack>
            <Stack.Screen name="(tabs)"  options={{ headerShown: false }}  />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </NavigationThemeProvider>
      </AppThemeProvider>
    </JotaiProvider>
  );
}
