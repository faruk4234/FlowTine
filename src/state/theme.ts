import { useColorScheme } from 'react-native';
import { useAtomValue } from 'jotai';
import { themeModeAtom } from './atoms';
import { Colors } from './colors';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  screenHorizontal: 24, // Centralized 24px screen padding from design
  screenVertical: 24,
};

export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  round: 9999,
};

export const Typography = {
  hero: { fontSize: 32, fontWeight: '700' as const },
  title: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '600' as const },
  bodyLarge: { fontSize: 18, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export type AppTheme = {
  colors: typeof Colors.light;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  typography: typeof Typography;
  isDark: boolean;
};

/**
 * Reusable hook to get the fully resolved theme object in any React/React Native component.
 * Automatically switches colors based on mode, keeping Spacing and Typography consistent.
 */
export const useAppTheme = (): AppTheme => {
  const themeMode = useAtomValue(themeModeAtom);
  const systemColorScheme = useColorScheme();

  const isDark = 
    themeMode === 'system' 
      ? systemColorScheme === 'dark' 
      : themeMode === 'dark';

  return {
    colors: isDark ? Colors.dark : Colors.light,
    spacing: Spacing,
    borderRadius: BorderRadius,
    typography: Typography,
    isDark,
  };
};

export { Colors };
