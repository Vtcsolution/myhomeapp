import { addressTitle, type BookingStatus } from '@myhome/shared';
import { useLocalSearchParams } from 'expo-router';
import { Car, FlaskConical, House, MapPin, SearchX } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StatusTimeline } from '@/components/booking/StatusTimeline';
import { TechnicianCard } from '@/components/booking/TechnicianCard';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBooking, useLiveTracking } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import type { TKey } from '@/i18n/translate';
import { travelProgress } from '@/lib/timeline';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const MINUTE_MS = 60_000;

const HEADLINE: Partial<Record<BookingStatus, TKey>> = {
  arrived: 'tracking.arrivedTitle',
  in_progress: 'tracking.workingTitle',
  completed: 'steps.completed',
  cancelled: 'steps.cancelled',
};

/**
 * Simulated arrival tracking. The API produces a synthetic journey from the
 * departure time; nothing here is a real location, and the screen says so.
 */
export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const booking = useBooking(id);
  const tracking = useLiveTracking(id);
  const now = useNow(15_000);

  const b = booking.data;
  const info = tracking.data;
  const status = info?.status ?? b?.status;
  const departedAt = b?.timeline.filter((e) => e.type === 'on_the_way').pop()?.at;
  const progress =
    status === 'arrived' || status === 'in_progress' || status === 'completed'
      ? 1
      : status === 'on_the_way' && departedAt
        ? travelProgress((now - Date.parse(departedAt)) / MINUTE_MS, info?.etaMinutes ?? null)
        : 0;

  const header = (
    <ScreenHeader
      back
      fallbackHref="/customer/bookings"
      title={t('tracking.title')}
      subtitle={b?.reference}
    />
  );

  if (booking.isError) {
    return (
      <Screen header={header}>
        <EmptyState icon={SearchX} title={t('booking.notFound')} />
      </Screen>
    );
  }

  const headline =
    status === 'on_the_way'
      ? t('tracking.eta')
      : status && HEADLINE[status]
        ? t(HEADLINE[status]!)
        : t('tracking.waiting');

  return (
    <Screen
      header={header}
      refreshing={tracking.isRefetching}
      onRefresh={() => void tracking.refetch()}
    >
      <View
        style={[styles.demo, { backgroundColor: colors.infoSoft, borderColor: colors.info }]}
        accessibilityRole="text"
      >
        <FlaskConical size={16} color={colors.info} strokeWidth={1.75} />
        <Text variant="captionStrong" style={[styles.flex, { color: colors.info }]}>
          {t('tracking.demo')}
        </Text>
      </View>

      {!b ? (
        <Skeleton height={220} rounded={radius.xl} />
      ) : (
        <Card tone="midnight">
          <Text variant="overline" style={{ color: colors.champagne }}>
            {headline}
          </Text>
          {status === 'on_the_way' && typeof info?.etaMinutes === 'number' ? (
            <Text
              variant="hero"
              style={[styles.eta, { color: colors.onMidnight }]}
              accessibilityLiveRegion="polite"
            >
              {t('tracking.minutes', { count: info.etaMinutes })}
            </Text>
          ) : (
            <Text variant="title2" style={[styles.headlineBody, { color: colors.onMidnight }]}>
              {f.date(b.scheduledStart, 'dayMonth')} ·{' '}
              {f.timeRange(b.scheduledStart, b.scheduledEnd)}
            </Text>
          )}

          <Journey progress={progress} />

          <View style={styles.legend}>
            <Text variant="caption" style={styles.legendText}>
              {t('tracking.start')}
            </Text>
            <Text variant="caption" style={styles.legendText}>
              {t('tracking.destination')}
            </Text>
          </View>

          <View style={[styles.meta, { borderTopColor: 'rgba(251,248,243,0.12)' }]}>
            {status === 'on_the_way' && typeof info?.distanceKm === 'number' ? (
              <Text variant="calloutStrong" style={{ color: colors.onMidnight }}>
                {t('tracking.away', { distance: info.distanceKm.toFixed(1) })}
              </Text>
            ) : (
              <View />
            )}
            {info ? (
              <Text variant="caption" style={styles.legendText}>
                {t('tracking.updated', { time: f.time(info.updatedAt) })}
              </Text>
            ) : null}
          </View>
        </Card>
      )}

      {b ? (
        <Card>
          <View style={styles.destination}>
            <View style={[styles.destIcon, { backgroundColor: colors.accentSoft }]}>
              <MapPin size={16} color={colors.accent} strokeWidth={1.75} />
            </View>
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">
                {addressTitle(b.address, locale)}
              </Text>
              <Text variant="bodyStrong">{f.address(b.address, 'full')}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      {b?.technician ? (
        <TechnicianCard technician={b.technician} chatThreadId={b.chatThreadId} />
      ) : null}

      {b ? (
        <Card>
          <Text variant="title3" style={styles.sectionTitle}>
            {t('booking.timeline')}
          </Text>
          <StatusTimeline booking={b} />
        </Card>
      ) : null}

      {tracking.isError ? <ErrorState onRetry={() => void tracking.refetch()} /> : null}
    </Screen>
  );
}

/** Abstract route line (not a map): start → marker → home, filled by progress. */
function Journey({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [fill, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: fill.get() * width }));

  return (
    <View
      style={styles.journey}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - MARKER)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <View style={[styles.rail, { backgroundColor: 'rgba(251,248,243,0.16)' }]} />
      <View style={styles.row}>
        <Animated.View style={[styles.fill, { backgroundColor: colors.champagne }, fillStyle]} />
        <View style={[styles.marker, { backgroundColor: colors.champagne }]}>
          <Car size={16} color={colors.midnight} strokeWidth={2} />
        </View>
      </View>
      <View
        style={[styles.home, { borderColor: colors.champagne, backgroundColor: colors.midnight }]}
      >
        <House size={12} color={colors.champagne} strokeWidth={2} />
      </View>
    </View>
  );
}

const MARKER = 34;

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  eta: { marginTop: space.xs },
  headlineBody: { marginTop: space.xs },
  journey: { height: MARKER, justifyContent: 'center', marginTop: space.xl },
  rail: { position: 'absolute', start: MARKER / 2, end: 10, height: 4, borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { height: 4, borderRadius: 2, marginStart: MARKER / 2, marginEnd: -MARKER / 2 },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  home: {
    position: 'absolute',
    end: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  legendText: { color: 'rgba(251,248,243,0.64)' },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  destination: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  destIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginBottom: space.lg },
});
