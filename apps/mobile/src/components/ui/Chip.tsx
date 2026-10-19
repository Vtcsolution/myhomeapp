import type { LucideIcon } from '@/components/ui/icons';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';
import { hapticSelection, PressableScale } from './Pressable';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  icon?: LucideIcon;
  onPress: () => void;
}

/** Compact selectable pill used for filters, sorting and suggestions. */
export function Chip({ label, selected = false, icon: Icon, onPress }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.textPrimary;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      {Icon ? <Icon size={14} color={fg} strokeWidth={1.75} /> : null}
      <Text variant="captionStrong" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Horizontally scrolling row of chips that bleeds to the screen edges. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rowBleed}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    height: 36,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  rowBleed: { marginHorizontal: -gutter, flexGrow: 0 },
  row: { paddingHorizontal: gutter, gap: space.sm },
});
