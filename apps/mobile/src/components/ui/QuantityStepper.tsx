import { Minus, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { hapticSelection, PressableScale } from './Pressable';
import { Text } from './Text';

export interface QuantityStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** − value + control; buttons disable at the bounds. */
export function QuantityStepper({ value, min, max, onChange }: QuantityStepperProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const button = (delta: -1 | 1) => {
    const next = value + delta;
    const disabled = next < min || next > max;
    const Icon = delta < 0 ? Minus : Plus;
    return (
      <PressableScale
        haptic={false}
        disabled={disabled}
        accessibilityLabel={delta < 0 ? t('service.decrease') : t('service.increase')}
        accessibilityState={{ disabled }}
        onPress={() => {
          hapticSelection();
          onChange(next);
        }}
        hitSlop={6}
        style={[
          styles.button,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: disabled ? 0.35 : 1,
          },
        ]}
      >
        <Icon size={18} color={colors.textPrimary} strokeWidth={1.75} />
      </PressableScale>
    );
  };
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
    >
      {button(-1)}
      <Text variant="title2" align="center" style={styles.value}>
        {value}
      </Text>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 32 },
});
