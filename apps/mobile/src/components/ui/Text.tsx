import {
  Platform,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import type { ThemeColors } from '@/theme/tokens';
import { type TextVariant, typeStyle } from '@/theme/typography';

export type TextTone =
  'primary' | 'secondary' | 'muted' | 'accent' | 'inverse' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: 'start' | 'center' | 'end';
  /**
   * Text written by people (messages, notes, subjects): it keeps its own
   * direction, so English punctuation stays in place inside Arabic screens.
   */
  natural?: boolean;
}

const toneColor = (colors: ThemeColors, tone: TextTone): string =>
  ({
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    accent: colors.accent,
    inverse: colors.onMidnight,
    danger: colors.danger,
    success: colors.success,
  })[tone];

/**
 * Typography primitive. Picks the right family for the active language,
 * aligns to the reading direction and never relies on `fontWeight`.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  align = 'start',
  natural = false,
  style,
  ...rest
}: TextProps) {
  const { locale, isRTL } = useLocale();
  const { colors } = useTheme();
  const textAlign: TextStyle['textAlign'] =
    align === 'center' ? 'center' : (align === 'start') !== isRTL ? 'left' : 'right';
  const writingDirection: TextStyle['writingDirection'] = natural ? 'auto' : isRTL ? 'rtl' : 'ltr';
  return (
    <RNText
      {...rest}
      // react-native-web: the HTML `dir` attribute is what detects direction.
      {...(natural && Platform.OS === 'web' ? ({ dir: 'auto' } as object) : {})}
      style={[
        typeStyle(variant, locale),
        {
          color: toneColor(colors, tone),
          textAlign,
          ...(natural && Platform.OS === 'web' ? {} : { writingDirection }),
        },
        style,
      ]}
    />
  );
}
