import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Availability pill: shows Online/Offline and toggles on press. */
export function OnlineToggle({
  online,
  busy,
  onToggle,
}: {
  online: boolean;
  busy?: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <PressableScale
      haptic
      disabled={busy}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: online, busy }}
      accessibilityLabel={online ? t('pro.online') : t('pro.offline')}
      style={[
        styles.pill,
        {
          backgroundColor: online ? colors.successSoft : colors.surfaceMuted,
          borderColor: online ? colors.success : colors.border,
          opacity: busy ? 0.6 : 1,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
      <Text
        variant="captionStrong"
        style={{ color: online ? colors.success : colors.textSecondary }}
      >
        {online ? t('pro.online') : t('pro.offline')}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
