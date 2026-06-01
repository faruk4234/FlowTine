export type AppColorScheme = 'light' | 'dark';
export type ThemeMode = 'system' | AppColorScheme;

/** Raw color tokens — single source of truth for all hex/rgba values */
const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // App shell (Obsidian Kinetic — default dark chrome)
  appBg: '#0F1115',
  appSurface: '#1A1D23',
  appSurfaceHigh: '#22262F',
  appBorder: '#2A2E38',
  appText: '#F1F5F9',
  appTextMuted: '#9CA3AF',
  appTextDim: '#64748B',
  appOverlay: 'rgba(15,17,21,0.35)',

  // Brand / semantic
  primary: 'orange',
  primaryDim: 'rgba(59,130,246,0.15)',
  primaryMuted: '#1E40AF',
  success: '#10B981',
  successBright: '#22C55E',
  warning: '#F97316',
  danger: '#EF4444',
  dangerDim: 'rgba(239,68,68,0.1)',
  dangerAccentDim: 'rgba(239,68,68,0.15)',
  dangerBorder: 'rgba(239,68,68,0.3)',
  yellow: '#FACC15',

  // Paywall
  paywallBg: '#070B12',
  paywallSurface: '#171A22',
  paywallSurfaceSoft: '#11151D',
  paywallSurfaceBtn: '#121722',
  paywallText: '#F4F7FC',
  paywallTextMuted: '#A6AFBF',
  paywallTextDim: '#6F7A8C',
  paywallBorder: '#242C38',
  paywallCtaText: '#111827',
  paywallMutedSurface: '#40444A',
  paywallMutedText: '#D1D5DB',
  overlayScrim: 'rgba(0,0,0,0.4)',

  // Category accents
  orange: '#F97316',
  orangeDim: 'rgba(249,115,22,0.15)',
  greenBright: '#22C55E',
  greenBrightDim: 'rgba(34,197,94,0.15)',
  purple: '#A855F7',
  purpleDim: 'rgba(168,85,247,0.15)',
  sky: '#38BDF8',
  skyDim: 'rgba(56,189,248,0.15)',
  indigo: '#818CF8',
  indigoDim: 'rgba(129,140,248,0.15)',
  rose: '#F43F5E',
  roseDim: 'rgba(244,63,94,0.15)',
  lime: '#84CC16',
  limeDim: 'rgba(132,204,22,0.15)',
  cyan: '#06B6D4',
  cyanDim: 'rgba(6,182,212,0.15)',

  // Light theme neutrals
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

  switchThumbOff: '#f4f3f4',
} as const;

/** Semantic tokens for the main app screens (home, settings, timer, etc.) */
export const AppPalette = {
  bg: palette.appBg,
  surface: palette.appSurface,
  surfaceHigh: palette.appSurfaceHigh,
  border: palette.appBorder,
  text: palette.appText,
  textMuted: palette.appTextMuted,
  textDim: palette.appTextDim,
  blue: palette.primary,
  blueDim: palette.primaryDim,
  green: palette.success,
  red: palette.danger,
  redDim: palette.dangerDim,
  redBorder: palette.dangerBorder,
  orange: palette.warning,
  white: palette.white,
} as const;

/** Paywall-specific surface palette */
export const PaywallPalette = {
  bg: palette.paywallBg,
  surface: palette.paywallSurface,
  surfaceSoft: palette.paywallSurfaceSoft,
  surfaceBtn: palette.paywallSurfaceBtn,
  text: palette.paywallText,
  textMuted: palette.paywallTextMuted,
  textDim: palette.paywallTextDim,
  blue: palette.primary,
  yellow: palette.yellow,
  border: palette.paywallBorder,
  borderSelected: palette.primary,
  ctaText: palette.paywallCtaText,
  mutedSurface: palette.paywallMutedSurface,
  mutedText: palette.paywallMutedText,
  white: palette.white,
  overlay: palette.overlayScrim,
} as const;

export const Colors = {
  light: {
    background: palette.gray50,
    surface: palette.white,
    surfaceElevated: palette.gray100,
    text: palette.gray900,
    mutedText: palette.gray600,
    primary: palette.primary,
    primaryPressed: palette.primaryMuted,
    border: palette.gray200,
    accent: palette.danger,
    tabBarActive: palette.primary,
    tabBarInactive: palette.gray500,
  },
  dark: {
    background: palette.appBg,
    surface: palette.appSurface,
    surfaceElevated: palette.appSurfaceHigh,
    text: palette.appText,
    mutedText: palette.appTextMuted,
    primary: palette.primary,
    primaryPressed: palette.primaryMuted,
    border: palette.appBorder,
    accent: palette.danger,
    tabBarActive: palette.primary,
    tabBarInactive: palette.appTextMuted,
  },
} as const satisfies Record<AppColorScheme, Record<string, string>>;

export type AppColors = (typeof Colors)[AppColorScheme];

/** Re-export raw tokens when a one-off value is needed (e.g. switch thumb) */
export { palette };
