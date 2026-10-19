import {
  addressTitle,
  bookingStatusLabels,
  bookingStatusTone,
  businessConfig,
  isApiError,
  isLiveStatus,
} from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarClock,
  CalendarSync,
  CircleHelp,
  Hourglass,
  MapPin,
  Navigation,
  NotebookPen,
  SearchX,
  CircleX,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ExtraChargesCard,
  PaymentCard,
  ReviewCard,
  WorkRecordCard,
} from '@/components/booking/BookingSections';
import { CancelSheet } from '@/components/booking/CancelSheet';
import { LiveBookingCard } from '@/components/booking/LiveBookingCard';
import { StatusTimeline } from '@/components/booking/StatusTimeline';
import { InfoRow, SummaryCard } from '@/components/booking/Summary';
import { TechnicianCard } from '@/components/booking/TechnicianCard';
import { PriceSummary } from '@/components/service/PriceSummary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Photo } from '@/components/ui/Photo';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBooking, useCancelBooking } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Everything about one booking: status, professional, timeline, price and actions. */
export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const booking = useBooking(id);
  const cancel = useCancelBooking();
  const [cancelOpen, setCancelOpen] = useState(false);

  const header = (
    <ScreenHeader
      back
      fallbackHref="/customer/bookings"
      title={booking.data ? f.text(booking.data.service.name) : t('booking.title')}
      subtitle={booking.data?.reference}
    />
  );

  if (booking.isPending) {
    return (
      <Screen header={header}>
        <Skeleton height={150} rounded={radius.xl} />
        <SkeletonList count={2} height={160} />
      </Screen>
    );
  }
  if (booking.isError) {
    const missing = isApiError(booking.error) && booking.error.code === 'NOT_FOUND';
    return (
      <Screen header={header}>
        {missing ? (
          <EmptyState
            icon={SearchX}
            title={t('booking.notFound')}
            actionLabel={t('bookings.title')}
            onAction={() => router.replace('/customer/bookings')}
          />
        ) : (
          <ErrorState onRetry={() => void booking.refetch()} />
        )}
      </Screen>
    );
  }

  const b = booking.data;
  const completedAt = b.timeline.filter((e) => e.type === 'completed').pop()?.at;
  const warrantyUntil =
    completedAt && b.service.warrantyDays
      ? new Date(Date.parse(completedAt) + b.service.warrantyDays * DAY_MS).toISOString()
      : undefined;
  const live = isLiveStatus(b.status);

  return (
    <Screen
      header={header}
      refreshing={booking.isRefetching}
      onRefresh={() => void booking.refetch()}
    >
      {/* Status */}
      <Card>
        <View style={styles.statusRow}>
          <Photo media={b.service.image} style={styles.thumb} />
          <View style={styles.flex}>
            <Badge
              label={f.text(bookingStatusLabels[b.status])}
              tone={bookingStatusTone[b.status]}
              dot={live}
            />
            <Text variant="title3" style={styles.statusTitle}>
              {f.text(b.service.name)}
            </Text>
            <Text variant="caption" tone="muted" style={styles.ltrStart}>
              {b.reference}
            </Text>
          </View>
        </View>
        {b.status === 'pending' ? (
          <View style={[styles.notice, { backgroundColor: colors.infoSoft }]}>
            <Hourglass size={18} color={colors.info} strokeWidth={1.75} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" style={{ color: colors.info }}>
                {t('booking.matchingTitle')}
              </Text>
              <Text variant="caption" tone="secondary">
                {t('booking.matchingBody')}
              </Text>
            </View>
          </View>
        ) : null}
        {b.status === 'cancelled' && b.cancellation ? (
          <View style={[styles.notice, { backgroundColor: colors.dangerSoft }]}>
            <CircleX size={18} color={colors.danger} strokeWidth={1.75} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone="danger">
                {t('booking.cancelledTitle')}
              </Text>
              <Text variant="caption" tone="secondary">
                {t('booking.cancelledOn', {
                  date: `${f.date(b.cancellation.at, 'dayMonth')} · ${f.time(b.cancellation.at)}`,
                })}
              </Text>
              {b.cancellation.fee > 0 ? (
                <Text variant="caption" tone="secondary">
                  {t('booking.fee')}: {f.money(b.cancellation.fee)}
                </Text>
              ) : null}
              {b.cancellation.refundAmount > 0 ? (
                <Text variant="caption" tone="secondary">
                  {t('booking.refund')}: {f.money(b.cancellation.refundAmount)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </Card>

      {live ? (
        <LiveBookingCard booking={b} onPress={() => router.push(customerRoutes.track(b.id))} />
      ) : null}
      {b.status === 'confirmed' ? (
        <Button
          label={t('booking.track')}
          icon={Navigation}
          variant="secondary"
          fullWidth
          onPress={() => router.push(customerRoutes.track(b.id))}
        />
      ) : null}

      {b.technician ? (
        <TechnicianCard technician={b.technician} chatThreadId={b.chatThreadId} />
      ) : null}

      <ExtraChargesCard booking={b} />
      <WorkRecordCard booking={b} />

      {b.status === 'completed' ? <ReviewCard booking={b} warrantyUntil={warrantyUntil} /> : null}

      <Card>
        <Text variant="title3" style={styles.sectionTitle}>
          {t('booking.timeline')}
        </Text>
        <StatusTimeline booking={b} />
      </Card>

      <SummaryCard>
        <InfoRow
          icon={CalendarClock}
          label={t('booking.when')}
          value={f.date(b.scheduledStart, 'full')}
          detail={f.timeRange(b.scheduledStart, b.scheduledEnd)}
        />
        <InfoRow
          icon={MapPin}
          label={`${t('booking.address')} · ${addressTitle(b.address, locale)}`}
          value={f.address(b.address, 'full')}
        />
        {b.customerNotes ? (
          <InfoRow icon={NotebookPen} label={t('booking.notes')} value={b.customerNotes} />
        ) : null}
      </SummaryCard>

      <PriceSummary price={b.price} />
      <PaymentCard booking={b} />

      {b.canReschedule || b.canCancel ? (
        <View style={styles.actions}>
          {b.canReschedule ? (
            <Button
              label={t('booking.reschedule')}
              icon={CalendarSync}
              variant="secondary"
              fullWidth
              onPress={() => router.push(customerRoutes.reschedule(b.id))}
            />
          ) : null}
          {b.canCancel ? (
            <Button
              label={t('booking.cancel')}
              icon={CircleX}
              variant="ghost"
              fullWidth
              onPress={() => setCancelOpen(true)}
            />
          ) : null}
          <Text variant="caption" tone="muted" align="center">
            {t('checkout.freeCancel', { hours: businessConfig.freeCancellationHours })}
          </Text>
        </View>
      ) : null}

      <Button
        label={t('booking.help')}
        icon={CircleHelp}
        variant="ghost"
        size="md"
        onPress={() => router.push(customerRoutes.newTicket({ bookingId: b.id }))}
      />

      {b.canCancel ? (
        <CancelSheet
          booking={b}
          visible={cancelOpen}
          loading={cancel.isPending}
          onClose={() => setCancelOpen(false)}
          onConfirm={(reason) =>
            cancel.mutate(
              { id: b.id, reason },
              {
                onSuccess: () => {
                  setCancelOpen(false);
                  show(t('booking.cancelledToast'), 'success');
                },
                onError: (e) => {
                  setCancelOpen(false);
                  show(errorMessage(e));
                  void booking.refetch();
                },
              },
            )
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2, alignItems: 'flex-start' },
  statusRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  statusTitle: { marginTop: space.xs },
  ltrStart: { writingDirection: 'ltr' },
  notice: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    marginTop: space.lg,
  },
  sectionTitle: { marginBottom: space.lg },
  actions: { gap: space.sm },
});
