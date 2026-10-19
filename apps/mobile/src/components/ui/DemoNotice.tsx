import { FlaskConical, type LucideIcon } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Text } from './Text';

/**
 * Discreet banner stating that a feature is simulated in this demo (wallet,
 * messaging, customer care, push notifications). Wording comes from the caller.
 */
export function DemoNotice({
  text,
  icon: Icon = FlaskConical,
}: {
  text: string;
  icon?: LucideIcon;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.notice, { backgroundColor: colors.infoSoft, borderColor: colors.info }]}
      accessibilityRole="text"
    >
      <Icon size={16} color={colors.info} strokeWidth={1.75} />
      <Text variant="caption" style={[styles.text, { color: colors.info }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  text: { flex: 1 },
});
