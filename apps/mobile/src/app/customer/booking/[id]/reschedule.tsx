import { businessConfig, isApiError, kuwaitDateOf } from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, CalendarX2 } from '@/components/ui/icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { type DateAvailability, SlotPicker } from '@/components/booking/SlotPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookableDates, useBooking, useRescheduleBooking, useSlotsByDate } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { firstAvailableDate, slotState } from '@/lib/slots';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { radius, space } from '@/theme/tokens';

/**
 * Move a booking to another arrival window. Windows come from the API's
 * reschedule availability (which ignores the booking's own current slot), and
 * the API enforces the free-change cut-off.
 */
export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const booking = useBooking(id);
  const allowed = booking.data?.canReschedule ?? false;
  const dates = useBookableDates();
  const request = useMemo(() => (id && allowed ? { bookingId: id } : null), [id, allowed]);
  const results = useSlotsByDate(dates.data, request);
  const reschedule = useRescheduleBooking();

  const availability = useMemo(() => {
    const map = new Map<string, DateAvailability>();
    (dates.data ?? []).forEach((date, i) => {
      const r = results[i];
      if (r)
        map.set(date, {
          slots: r.data,
          isPending: r.isPending,
          isError: r.isError,
          refetch: () => void r.refetch(),
        });
    });
    return map;
  }, [dates.data, results]);

  const [pickedDate, setPickedDate] = useState<string>();
  const [slot, setSlot] = useState<{ start: string; end: string }>();
  const currentStart = booking.data?.scheduledStart;
  // The booking's own window is never offered as a new time.
  const openSlots = new Map(
    [...availability].map(([d, a]) => [
      d,
      a.slots?.filter((s) => slotState(s, undefined, currentStart) === 'available'),
    ]),
  );
  const firstOpen = firstAvailableDate(dates.data ?? [], openSlots);
  const currentDate = currentStart ? kuwaitDateOf(currentStart) : undefined;
  const selectedDate =
    pickedDate ?? (currentDate && openSlots.get(currentDate)?.length ? currentDate : firstOpen);
  const unchanged =
    !!slot &&
    !!currentStart &&
    slotState({ ...slot, available: true, capacity: 1 }, undefined, currentStart) === 'current';

  const header = (
    <ScreenHeader
      back
      fallbackHref="/customer/bookings"
      title={t('reschedule.title')}
      subtitle={t('reschedule.subtitle', { hours: businessConfig.freeCancellationHours })}
    />
  );

  if (booking.isPending) {
    return (
      <Screen header={header}>
        <Skeleton height={300} rounded={radius.xl} />
      </Screen>
    );
  }
  if (booking.isError) {
    return (
      <Screen header={header}>
        <ErrorState onRetry={() => void booking.refetch()} />
      </Screen>
    );
  }
  const b = booking.data;
  if (!b.canReschedule) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={CalendarX2}
          title={t('reschedule.notAllowed')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const confirm = () => {
    if (!slot || unchanged) return;
    const hadTechnician = b.technicianId !== null;
    reschedule.mutate(
      { id: b.id, slotStart: slot.start },
      {
        onSuccess: (updated) => {
          show(
            hadTechnician && updated.status === 'pending'
              ? t('reschedule.rematch')
              : t('reschedule.done'),
            'success',
          );
          router.back();
        },
        onError: (e) => {
          setSlot(undefined);
          show(
            isApiError(e) && e.code === 'SLOT_UNAVAILABLE'
              ? t('checkout.errorSlot')
              : errorMessage(e),
          );
          void booking.refetch();
        },
      },
    );
  };

  return (
    <Screen
      header={header}
      footer={
        <View style={styles.footer}>
          {slot ? (
            <Text variant="callout" tone="secondary" align="center" numberOfLines={1}>
              {t('bookFlow.selected', {
                date: f.date(slot.start, 'dayMonth'),
                range: f.timeRange(slot.start, slot.end),
              })}
            </Text>
          ) : null}
          <Button
            label={t('reschedule.confirm')}
            icon={CalendarCheck}
            fullWidth
            disabled={!slot || unchanged}
            loading={reschedule.isPending}
            onPress={confirm}
          />
        </View>
      }
    >
      <Card tone="muted">
        <Text variant="callout" tone="secondary">
          {t('reschedule.current', {
            date: f.date(b.scheduledStart, 'dayMonth'),
            range: f.timeRange(b.scheduledStart, b.scheduledEnd),
          })}
        </Text>
      </Card>
      {dates.isPending ? (
        <Skeleton height={300} rounded={radius.xl} />
      ) : dates.isError ? (
        <ErrorState onRetry={() => void dates.refetch()} />
      ) : (
        <SlotPicker
          dates={dates.data}
          availability={availability}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setPickedDate(date);
            setSlot(undefined);
          }}
          selectedSlot={slot?.start}
          currentSlot={currentStart}
          onSelectSlot={(s) => setSlot({ start: s.start, end: s.end })}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.sm },
});
