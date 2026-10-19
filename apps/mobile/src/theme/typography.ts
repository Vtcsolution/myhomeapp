import type { Locale } from '@myhome/shared';
import type { TextStyle } from 'react-native';

/**
 * Font family names as registered with `useFonts` (see `fonts.ts`).
 * Latin: Fraunces (display serif) + Manrope (body). Arabic: IBM Plex Sans Arabic.
 * Weights are expressed through the family name — never via `fontWeight` —
 * so Android renders the intended cut.
 */
export const fontFamilies = {
  displayRegular: 'Fraunces_400Regular',
  displaySemiBold: 'Fraunces_600SemiBold',
  bodyRegular: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  arabicRegular: 'IBMPlexSansArabic_400Regular',
  arabicMedium: 'IBMPlexSansArabic_500Medium',
  arabicSemiBold: 'IBMPlexSansArabic_600SemiBold',
  arabicBold: 'IBMPlexSansArabic_700Bold',
} as const;

export type TextVariant =
  | 'hero'
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'calloutStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline'
  | 'button'
  | 'numeral';

interface VariantSpec {
  size: number;
  lineHeight: number;
  latin: keyof typeof fontFamilies;
  arabic: keyof typeof fontFamilies;
  letterSpacing?: number;
  uppercase?: boolean;
}

const variants: Record<TextVariant, VariantSpec> = {
  hero: {
    size: 34,
    lineHeight: 40,
    latin: 'displayRegular',
    arabic: 'arabicSemiBold',
    letterSpacing: -0.6,
  },
  display: {
    size: 30,
    lineHeight: 36,
    latin: 'displaySemiBold',
    arabic: 'arabicSemiBold',
    letterSpacing: -0.4,
  },
  title1: {
    size: 24,
    lineHeight: 30,
    latin: 'displaySemiBold',
    arabic: 'arabicSemiBold',
    letterSpacing: -0.2,
  },
  title2: {
    size: 19,
    lineHeight: 26,
    latin: 'bodyBold',
    arabic: 'arabicSemiBold',
    letterSpacing: -0.1,
  },
  title3: { size: 16, lineHeight: 22, latin: 'bodyBold', arabic: 'arabicSemiBold' },
  body: { size: 15, lineHeight: 22, latin: 'bodyRegular', arabic: 'arabicRegular' },
  bodyStrong: { size: 15, lineHeight: 22, latin: 'bodySemiBold', arabic: 'arabicMedium' },
  callout: { size: 14, lineHeight: 20, latin: 'bodyMedium', arabic: 'arabicRegular' },
  calloutStrong: { size: 14, lineHeight: 20, latin: 'bodyBold', arabic: 'arabicSemiBold' },
  caption: { size: 12, lineHeight: 16, latin: 'bodyMedium', arabic: 'arabicRegular' },
  captionStrong: { size: 12, lineHeight: 16, latin: 'bodyBold', arabic: 'arabicSemiBold' },
  overline: {
    size: 11,
    lineHeight: 14,
    latin: 'bodyBold',
    arabic: 'arabicSemiBold',
    letterSpacing: 1.4,
    uppercase: true,
  },
  button: {
    size: 15,
    lineHeight: 20,
    latin: 'bodyBold',
    arabic: 'arabicSemiBold',
    letterSpacing: 0.2,
  },
  numeral: {
    size: 28,
    lineHeight: 34,
    latin: 'displaySemiBold',
    arabic: 'displaySemiBold',
    letterSpacing: -0.3,
  },
};

/** Arabic script needs a little more vertical room than Latin at the same size. */
const ARABIC_LINE_HEIGHT_FACTOR = 1.12;

export function typeStyle(variant: TextVariant, locale: Locale): TextStyle {
  const spec = variants[variant];
  const isArabic = locale === 'ar';
  return {
    fontFamily: fontFamilies[isArabic ? spec.arabic : spec.latin],
    fontSize: spec.size,
    lineHeight: Math.round(spec.lineHeight * (isArabic ? ARABIC_LINE_HEIGHT_FACTOR : 1)),
    // Letter-spacing and capitals break Arabic joining, so they are Latin-only.
    ...(!isArabic && spec.letterSpacing ? { letterSpacing: spec.letterSpacing } : {}),
    ...(!isArabic && spec.uppercase ? { textTransform: 'uppercase' as const } : {}),
  };
}
