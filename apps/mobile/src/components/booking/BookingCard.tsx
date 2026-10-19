import {
  type BookingView,
  bookingStatusLabels,
  bookingStatusTone,
  isLiveStatus,
} from '@myhome/shared';
import { CalendarClock, UserRound } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Photo } from '@/components/ui/Photo';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Booking summary used in the customer's booking lists. */
export function BookingCard({ booking, onPress }: { booking: BookingView; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const f = useFormat();
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${f.text(booking.service.name)}, ${booking.reference}`}
    >
      <View style={styles.top}>
        <Photo media={booking.service.image} style={styles.thumb} />
        <View style={styles.titles}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {f.text(booking.service.name)}
          </Text>
          <Text variant="caption" tone="muted">
            {booking.reference}
          </Text>
          <Badge
            label={f.text(bookingStatusLabels[booking.status])}
            tone={bookingStatusTone[booking.status]}
            dot={isLiveStatus(booking.status)}
          />
        </View>
        <Text variant="calloutStrong">{f.money(booking.price.total)}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <CalendarClock size={15} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" tone="secondary" style={styles.metaText} numberOfLines={1}>
            {f.date(booking.scheduledStart, 'dayMonth')} ·{' '}
            {f.timeRange(booking.scheduledStart, booking.scheduledEnd)}
          </Text>
        </View>
        {booking.technician || booking.status === 'pending' ? (
          <View style={styles.metaItem}>
            <UserRound size={15} color={colors.textMuted} strokeWidth={1.75} />
            <Text variant="caption" tone="secondary" style={styles.metaText} numberOfLines={1}>
              {booking.technician ? f.text(booking.technician.fullName) : t('bookings.matching')}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  titles: { flex: 1, gap: space.xs },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: space.md },
  meta: { gap: space.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  metaText: { flex: 1 },
});
