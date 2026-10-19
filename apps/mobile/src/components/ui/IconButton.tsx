import type { LucideIcon } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { radius } from '@/theme/tokens';
import { DirectionalIcon } from './DirectionalIcon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  /** Mirror the glyph in right-to-left layouts (back arrows, chevrons). */
  directional?: boolean;
  /** Small count badge, e.g. unread notifications. */
  badge?: number;
  tone?: 'surface' | 'translucent';
}

export function IconButton({
  icon,
  label,
  onPress,
  directional,
  badge,
  tone = 'surface',
}: IconButtonProps) {
  const { colors } = useTheme();
  const translucent = tone === 'translucent';
  const color = translucent ? colors.onMidnight : colors.textPrimary;
  const Icon = icon;
  return (
    <PressableScale
      haptic
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.button,
        translucent
          ? { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.24)' }
          : { backgroundColor: colors.surface, borderColor: colors.hairline },
      ]}
    >
      {directional ? (
        <DirectionalIcon icon={icon} size={20} color={color} strokeWidth={1.75} />
      ) : (
        <Icon size={20} color={color} strokeWidth={1.75} />
      )}
      {badge ? (
        <View
          style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.surface }]}
        >
          <Text variant="captionStrong" style={[styles.badgeText, { color: colors.onAccent }]}>
            {badge > 9 ? '9+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
