import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/Headers';
import { Text } from '@/components/ui/Text';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, space } from '@/theme/tokens';

const TOTAL_STEPS = 4;

/** Booking-step header: back button, a four-segment progress bar and the title. */
export function FlowHeader({
  step,
  title,
  subtitle,
  fallbackHref,
}: {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  fallbackHref: Href;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  return (
    <View>
      <ScreenHeader back fallbackHref={fallbackHref} />
      <View style={styles.progressBlock}>
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step }}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                { backgroundColor: i < step ? colors.accent : colors.border },
              ]}
            />
          ))}
        </View>
        <Text variant="overline" tone="muted">
          {t('bookFlow.step', { step })}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="callout" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBlock: {
    paddingHorizontal: gutter,
    paddingBottom: space.lg,
    gap: space.xs,
    marginTop: -space.sm,
  },
  progress: { flexDirection: 'row', gap: space.xs, marginBottom: space.md },
  segment: { flex: 1, height: 3, borderRadius: 2 },
});
