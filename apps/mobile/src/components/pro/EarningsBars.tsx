import {
  daysBetweenLocalDates,
  kuwaitDateOf,
  weekdayName,
  weekdayOfLocalDate,
} from '@myhome/shared';
import { StyleSheet, View } from 'react-native';
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
  const buckets: Point[] = [];
  for (let i = series.length; i > 0; i -= bucketSize) {
    const slice = series.slice(Math.max(0, i - bucketSize), i);
    const last = slice[slice.length - 1];
    if (last) buckets.unshift({ date: last.date, net: slice.reduce((s, p) => s + p.net, 0) });
  }
  const max = Math.max(1, ...buckets.map((b) => b.net));
  const peak = buckets.reduce<Point | null>(
    (best, b) => (!best || b.net > best.net ? b : best),
    null,
  );

  // Daily bars are labelled by weekday; grouped bars by the day of the month they end on.
  const label = (date: string) =>
    bucketSize === 1
      ? weekdayName(weekdayOfLocalDate(date), locale, true)
      : String(Number(date.slice(8, 10)));

  return (
    <View accessibilityRole="image" accessibilityLabel={peak ? f.money(peak.net) : undefined}>
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {buckets.map((b) => {
          const isToday = daysBetweenLocalDates(b.date, today) === 0;
          const isPeak = peak?.date === b.date && b.net > 0;
          return (
            <View key={b.date} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(3, (b.net / max) * CHART_HEIGHT),
                    backgroundColor: isPeak || isToday ? colors.accent : colors.border,
                  },
                ]}
              />
            </View>
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
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  column: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 28, borderRadius: 6 },
  labels: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  label: { fontSize: 10 },
});
