import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Switch, View } from 'react-native';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** A setting with an on/off switch; the whole row is tappable. */
export function ToggleRow({
  icon: Icon,
  title,
  body,
  value,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  const toggle = () => {
    hapticSelection();
    onChange(!value);
  };
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      accessibilityHint={body}
      style={styles.row}
    >
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon size={18} color={colors.accent} strokeWidth={1.75} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        {body ? (
          <Text variant="caption" tone="secondary">
            {body}
          </Text>
        ) : null}
      </View>
      {/* The whole row handles the press; the switch only shows the state. */}
      <View pointerEvents="none">
        <Switch
          value={value}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.border}
          // react-native-web colours the "on" thumb separately.
          {...({ activeThumbColor: colors.surface } as object)}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 64,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
});
