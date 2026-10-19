import { brand, type BrandPalette } from '@myhome/shared';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors extends BrandPalette {
  /** Fixed deep tone used behind photography (identical in both schemes). */
  midnight: string;
  /** Champagne tone that stays legible on photography and midnight. */
  champagne: string;
  onMidnight: string;
  scrim: string;
  overlay: string;
  hairline: string;
  inputBackground: string;
  skeleton: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;
}

const derived = (p: BrandPalette, scheme: ColorScheme): ThemeColors => ({
  ...p,
  midnight: brand.palette.light.primary,
  champagne: brand.palette.dark.accent,
  onMidnight: brand.palette.light.onPrimary,
  scrim: 'rgba(8, 14, 21, 0.55)',
  overlay: scheme === 'light' ? 'rgba(15, 29, 43, 0.04)' : 'rgba(255, 255, 255, 0.05)',
  hairline: scheme === 'light' ? 'rgba(20, 26, 33, 0.08)' : 'rgba(243, 239, 232, 0.08)',
  inputBackground: scheme === 'light' ? p.surface : p.surfaceMuted,
  skeleton: scheme === 'light' ? '#ECE6DC' : '#1D2A36',
  successSoft: scheme === 'light' ? '#E6F2EC' : 'rgba(91, 179, 139, 0.14)',
  warningSoft: scheme === 'light' ? '#F8EEDC' : 'rgba(224, 169, 74, 0.14)',
  dangerSoft: scheme === 'light' ? '#F6E4E2' : 'rgba(224, 122, 112, 0.14)',
  infoSoft: scheme === 'light' ? '#E4ECF4' : 'rgba(122, 166, 209, 0.14)',
});

export const palettes: Record<ColorScheme, ThemeColors> = {
  light: derived(brand.palette.light, 'light'),
  dark: derived(brand.palette.dark, 'dark'),
};

/** 4-pt spacing scale. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Horizontal page gutter. */
export const gutter = 20;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const elevation = {
  card: '0px 6px 20px rgba(15, 29, 43, 0.06)',
  raised: '0px 12px 32px rgba(15, 29, 43, 0.10)',
  floating: '0px 16px 40px rgba(8, 14, 21, 0.18)',
} as const;

export const motion = {
  fast: 140,
  base: 220,
  slow: 360,
  pressScale: 0.975,
} as const;
