import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { Colors, type AppColorScheme, type AppColors, type ThemeMode } from '@/src/state/colors';
import { storage } from '@/src/storage/storage';

type AppThemeContextValue = {
  mode: ThemeMode;
  scheme: AppColorScheme;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const THEME_MODE_KEY = 'theme.mode';

function normalizeScheme(scheme: string | null | undefined): AppColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let mounted = true;
    storage
      .getJSON<ThemeMode>(THEME_MODE_KEY)
      .then((value) => {
        if (!mounted) return;
        if (value === 'light' || value === 'dark' || value === 'system') setModeState(value);
      })
      .catch(() => {
        // ignore read errors; fall back to default
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scheme: AppColorScheme = mode === 'system' ? normalizeScheme(systemScheme) : mode;
  const colors = Colors[scheme];

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    storage.setJSON(THEME_MODE_KEY, nextMode).catch(() => {
      // ignore write errors
    });
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({ mode, scheme, colors, setMode }),
    [mode, scheme, colors, setMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}

