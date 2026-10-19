import type { ServiceAddOn } from '@myhome/shared';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Optional extras as checkbox rows with price and added time. */
export function AddOnList({
  addOns,
  selectedIds,
  onToggle,
}: {
  addOns: ServiceAddOn[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { colors } = useTheme();
  const f = useFormat();
  return (
    <View style={styles.list}>
      {addOns.map((addOn) => {
        const checked = selectedIds.includes(addOn.id);
        return (
          <PressableScale
            key={addOn.id}
            scaleTo={0.985}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${f.text(addOn.name)}, ${f.money(addOn.price)}`}
            onPress={() => {
              hapticSelection();
              onToggle(addOn.id);
            }}
            style={[
              styles.row,
              {
                borderColor: checked ? colors.accent : colors.border,
                backgroundColor: checked ? colors.accentSoft : colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.box,
                {
                  borderColor: checked ? colors.accent : colors.border,
                  backgroundColor: checked ? colors.accent : 'transparent',
                },
              ]}
            >
              {checked ? <Check size={14} color={colors.onAccent} strokeWidth={2.5} /> : null}
            </View>
            <View style={styles.texts}>
              <Text variant="bodyStrong">{f.text(addOn.name)}</Text>
              {addOn.durationMin > 0 ? (
                <Text variant="caption" tone="muted">
                  +{f.duration(addOn.durationMin)}
                </Text>
              ) : null}
            </View>
            <Text variant="calloutStrong">{f.money(addOn.price, { showPlusSign: true })}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
});
