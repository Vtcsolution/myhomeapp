import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { elevation, radius, space } from '@/theme/tokens';
import { PressableScale } from './Pressable';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
  tone?: 'surface' | 'muted' | 'midnight';
  style?: StyleProp<ViewStyle>;
}

/** Elevated surface with a hairline border; pressable when `onPress` is set. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  padded = true,
  tone = 'surface',
  style,
}: CardProps) {
  const { colors, scheme } = useTheme();
  const background = {
    surface: colors.surface,
    muted: colors.surfaceMuted,
    midnight: colors.midnight,
  }[tone];
  const cardStyle = [
    styles.card,
    {
      backgroundColor: background,
      borderColor: tone === 'midnight' ? 'transparent' : colors.hairline,
      boxShadow: tone === 'surface' && scheme === 'light' ? elevation.card : undefined,
    },
    padded && styles.padded,
    style,
  ];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={cardStyle}>
        {children}
      </PressableScale>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  padded: { padding: space.lg },
});
