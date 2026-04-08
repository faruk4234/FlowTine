export type AppColorScheme = 'light' | 'dark';
export type ThemeMode = 'system' | AppColorScheme;

const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Neutrals / Grayscale
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1F2937',
  gray900: '#0F172A',
  
  // Specific UI Colors based on extraction
  darkBg: '#121212', // App background dark mode
  darkSurface: '#1C1C1E', // Card/Surface dark mode
  darkSurfaceElevated: '#2A2A2D',

  primaryElectric: '#3B82F6', // Vibrant blue action color
  primaryElectricMuted: '#1E40AF',
  accentRed: '#F87171',
} as const;

export const Colors = {
  light: {
    background: palette.gray50,
    surface: palette.white,
    surfaceElevated: palette.gray100,

    text: palette.gray900,
    mutedText: palette.gray600,

    primary: palette.primaryElectric,
    primaryPressed: palette.primaryElectricMuted,

    border: palette.gray200,
    accent: palette.accentRed,

    tabBarActive: palette.primaryElectric,
    tabBarInactive: palette.gray500,
  },
  dark: {
    background: palette.darkBg,
    surface: palette.darkSurface,
    surfaceElevated: palette.darkSurfaceElevated,

    text: '#F2F4F7', 
    mutedText: '#A1A1AA',

    primary: palette.primaryElectric,
    primaryPressed: palette.primaryElectricMuted,

    border: '#27272A', // subtle border for dark mode
    accent: palette.accentRed,

    tabBarActive: palette.primaryElectric,
    tabBarInactive: '#A1A1AA',
  },
} as const satisfies Record<AppColorScheme, Record<string, string>>;

export type AppColors = (typeof Colors)[AppColorScheme];
