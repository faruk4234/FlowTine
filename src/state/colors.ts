export type AppColorScheme = 'light' | 'dark';
export type ThemeMode = 'system' | AppColorScheme;

const palette = {
  white: '#FFFFFF',
  black: '#000000',

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

  blue500: '#0A7EA4',
  blue600: '#086A8A',
  teal500: '#22C55E',
  red500: '#EF4444',
  amber500: '#F59E0B',
} as const;

export const Colors = {
  light: {
    background: palette.white,
    text: palette.gray900,
    mutedText: palette.gray600,

    primary: palette.blue500,
    primaryPressed: palette.blue600,

    border: palette.gray200,
    card: palette.gray50,

    tabBarActive: palette.blue500,
    tabBarInactive: palette.gray500,
  },
  dark: {
    background: '#0B0F14',
    text: palette.gray100,
    mutedText: palette.gray400,

    primary: palette.white,
    primaryPressed: palette.gray200,

    border: '#1B2530',
    card: '#0F151D',

    tabBarActive: palette.white,
    tabBarInactive: palette.gray400,
  },
} as const satisfies Record<AppColorScheme, Record<string, string>>;

export type AppColors = (typeof Colors)[AppColorScheme];

