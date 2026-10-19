import type { StatusTone } from '@myhome/shared';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Text } from './Text';

export interface BadgeProps {
  label: string;
  tone?: StatusTone;
  /** Leading dot, e.g. for live statuses. */
  dot?: boolean;
}

export function Badge({ label, tone = 'neutral', dot }: BadgeProps) {
  const { colors } = useTheme();
  const palette: Record<StatusTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    info: { bg: colors.infoSoft, fg: colors.info },
    accent: { bg: colors.accentSoft, fg: colors.accentText },
    success: { bg: colors.successSoft, fg: colors.successText },
    warning: { bg: colors.warningSoft, fg: colors.warningText },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const { bg, fg } = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      <Text variant="captionStrong" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs + 2,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
