import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { DirectionalIcon } from './DirectionalIcon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'inverse';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Trailing icon (usually an arrow); mirrored in right-to-left layouts. */
  trailingIcon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const heights: Record<ButtonSize, number> = { lg: 56, md: 48, sm: 38 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  trailingIcon: Trailing,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    accent: { bg: colors.accent, fg: colors.onAccent, border: 'transparent' },
    secondary: { bg: 'transparent', fg: colors.textPrimary, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.textPrimary, border: 'transparent' },
    inverse: {
      bg: 'rgba(255,255,255,0.12)',
      fg: colors.onMidnight,
      border: 'rgba(255,255,255,0.28)',
    },
  }[variant];
  const inactive = disabled || loading;

  return (
    <PressableScale
      haptic
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: size === 'sm' ? space.lg : space.xxl,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {Icon ? (
            <Icon size={size === 'sm' ? 16 : 18} color={palette.fg} strokeWidth={1.75} />
          ) : null}
          <Text
            variant={size === 'sm' ? 'captionStrong' : 'button'}
            style={{ color: palette.fg }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {Trailing ? (
            <DirectionalIcon
              icon={Trailing}
              size={size === 'sm' ? 16 : 18}
              color={palette.fg}
              strokeWidth={1.75}
            />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
