import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { hapticSelection, PressableScale } from './Pressable';
import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  size?: 'md' | 'sm';
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  size = 'md',
}: SegmentedControlProps<T>) {
  const { colors, scheme } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <PressableScale
            key={segment.value}
            scaleTo={1}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label}
            onPress={() => {
              if (selected) return;
              hapticSelection();
              onChange(segment.value);
            }}
            style={[
              styles.segment,
              size === 'sm' && styles.segmentSmall,
              selected && {
                backgroundColor: colors.surface,
                boxShadow: scheme === 'light' ? '0px 2px 8px rgba(15, 29, 43, 0.08)' : undefined,
              },
            ]}
          >
            <Text
              variant={size === 'sm' ? 'captionStrong' : 'calloutStrong'}
              tone={selected ? 'primary' : 'muted'}
              align="center"
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSmall: { minHeight: 32 },
});
