import { isUnitPriced, type Service, type ServiceOptionGroup } from '@myhome/shared';
import { StyleSheet, View } from 'react-native';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Single-choice option group rendered as radio cards with their price effect. */
export function OptionGroupPicker({
  service,
  group,
  selectedId,
  onSelect,
}: {
  service: Service;
  group: ServiceOptionGroup;
  selectedId: string | undefined;
  onSelect: (choiceId: string) => void;
}) {
  const { colors } = useTheme();
  const f = useFormat();
  const perUnit = isUnitPriced(service) && service.unitLabel;

  return (
    <View
      style={styles.group}
      accessibilityRole="radiogroup"
      accessibilityLabel={f.text(group.label)}
    >
      <Text variant="captionStrong" tone="secondary">
        {f.text(group.label)}
      </Text>
      <View style={styles.choices}>
        {group.choices.map((choice) => {
          const selected = choice.id === selectedId;
          const delta = choice.priceDelta
            ? `${f.money(choice.priceDelta, { showPlusSign: true })}${perUnit ? ` ${f.text(service.unitLabel!)}` : ''}`
            : null;
          return (
            <PressableScale
              key={choice.id}
              scaleTo={0.985}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${f.text(choice.label)}${delta ? `, ${delta}` : ''}`}
              onPress={() => {
                if (selected) return;
                hapticSelection();
                onSelect(choice.id);
              }}
              style={[
                styles.choice,
                {
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <View
                style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}
              >
                {selected ? (
                  <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                ) : null}
              </View>
              <Text variant="bodyStrong" style={styles.label}>
                {f.text(choice.label)}
              </Text>
              {delta ? (
                <Text variant="caption" tone={choice.priceDelta < 0 ? 'success' : 'secondary'}>
                  {delta}
                </Text>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  choices: { gap: space.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1 },
});
