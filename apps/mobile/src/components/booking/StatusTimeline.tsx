import type { Booking } from '@myhome/shared';
import { Check, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { buildTimeline } from '@/lib/timeline';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

/** Vertical lifecycle stepper with timestamps for reached steps. */
export function StatusTimeline({ booking }: { booking: Pick<Booking, 'status' | 'timeline'> }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const steps = buildTimeline(booking);
  return (
    <View accessibilityRole="list">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const cancelled = step.status === 'cancelled';
        const dotColor = cancelled
          ? colors.danger
          : step.state === 'upcoming'
            ? colors.border
            : colors.accent;
        return (
          <View
            key={step.status}
            style={styles.step}
            accessible
            accessibilityLabel={t(`steps.${step.status}`)}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: step.state === 'done' || cancelled ? dotColor : colors.surface,
                    borderColor: dotColor,
                  },
                ]}
              >
                {cancelled ? (
                  <X size={11} color={colors.onPrimary} strokeWidth={3} />
                ) : step.state === 'done' ? (
                  <Check size={11} color={colors.onAccent} strokeWidth={3} />
                ) : step.state === 'current' ? (
                  <View style={[styles.inner, { backgroundColor: colors.accent }]} />
                ) : null}
              </View>
              {!last ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: step.state === 'done' ? colors.accent : colors.border },
                  ]}
                />
              ) : null}
            </View>
            <View style={[styles.texts, !last && styles.textsSpacing]}>
              <Text
                variant={step.state === 'current' ? 'bodyStrong' : 'callout'}
                tone={step.state === 'upcoming' ? 'muted' : cancelled ? 'danger' : 'primary'}
              >
                {t(`steps.${step.status}`)}
              </Text>
              {step.at ? (
                <Text variant="caption" tone="muted">
                  {f.date(step.at, 'dayMonth')} · {f.time(step.at)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 20 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, minHeight: 18, marginVertical: 2 },
  texts: { flex: 1, gap: 2, paddingBottom: space.xs },
  textsSpacing: { paddingBottom: space.lg },
});
