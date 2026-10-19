import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

/** Five tappable stars (always ordered 1→5 in reading direction). */
export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <PressableScale
          key={n}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={t('booking.ratingLabel', { count: n })}
          hitSlop={6}
          onPress={() => {
            hapticSelection();
            onChange(n);
          }}
        >
          <Star
            size={34}
            color={colors.accent}
            fill={n <= value ? colors.accent : 'transparent'}
            strokeWidth={1.25}
          />
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
});
