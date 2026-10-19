import {
  daysBetweenLocalDates,
  kuwaitDateOf,
  kuwaitLocalToISO,
  weekdayName,
  weekdayOfLocalDate,
} from '@myhome/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

interface Point {
  date: string;
  net: number;
}

interface Bucket extends Point {
  /** First day in the bucket (same as `date` for daily bars). */
  from: string;
}

const CHART_HEIGHT = 132;

/**
 * Minimal bar chart of daily net earnings. For longer ranges the days are
 * grouped into weeks so bars stay legible on a phone.
 */
export function EarningsBars({ series }: { series: Point[] }) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const f = useFormat();
  const today = kuwaitDateOf(useNow());

  const bucketSize = series.length > 31 ? 7 : series.length > 7 ? 3 : 1;
  const buckets: Bucket[] = [];
  for (let i = series.length; i > 0; i -= bucketSize) {
    const slice = series.slice(Math.max(0, i - bucketSize), i);
    const first = slice[0];
    const last = slice[slice.length - 1];
    if (first && last) {
      buckets.unshift({
        date: last.date,
        from: first.date,
        net: slice.reduce((s, p) => s + p.net, 0),
      });
    }
  }
  const max = Math.max(1, ...buckets.map((b) => b.net));
  const peak = buckets.reduce<Bucket | null>(
    (best, b) => (!best || b.net > best.net ? b : best),
    null,
  );

  // Daily bars are labelled by weekday; grouped bars by the day of the month they end on.
  const label = (date: string) =>
    bucketSize === 1
      ? weekdayName(weekdayOfLocalDate(date), locale, true)
      : String(Number(date.slice(8, 10)));

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected =
    buckets.find((b) => b.date === selectedDate) ?? buckets[buckets.length - 1] ?? null;
  const day = (date: string) => f.date(kuwaitLocalToISO(date, '12:00'), 'dayMonth');
  const period = (b: Bucket) =>
    b.from === b.date ? day(b.date) : `${day(b.from)} – ${day(b.date)}`;

  return (
    <View>
      {selected ? (
        <Text variant="calloutStrong" style={styles.selected} accessibilityLiveRegion="polite">
          {period(selected)} · {f.money(selected.net)}
        </Text>
      ) : null}
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {buckets.map((b) => {
          const isToday = daysBetweenLocalDates(b.date, today) === 0;
          const isPeak = peak?.date === b.date && b.net > 0;
          const isSelected = selected?.date === b.date;
          return (
            <PressableScale
              key={b.date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${period(b)}, ${f.money(b.net)}`}
              onPress={() => setSelectedDate(b.date)}
              style={styles.column}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(3, (b.net / max) * CHART_HEIGHT),
                    backgroundColor: isSelected
                      ? colors.primary
                      : isPeak || isToday
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              />
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.labels}>
        {buckets.map((b, i) => (
          <View key={b.date} style={styles.column}>
            {buckets.length <= 8 || i % 2 === buckets.length % 2 ? (
              <Text
                variant="caption"
                tone="muted"
                align="center"
                numberOfLines={1}
                style={styles.label}
              >
                {label(b.date)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selected: { marginBottom: space.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', maxWidth: 28, borderRadius: 6 },
  labels: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  label: { fontSize: 10 },
});
