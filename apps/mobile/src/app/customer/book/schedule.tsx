import { addressTitle, businessConfig, kuwaitDateOf } from '@myhome/shared';
import { router } from 'expo-router';
import { ArrowRight, CalendarX2, MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlowHeader } from '@/components/booking/FlowHeader';
import { FlowMissing } from '@/components/booking/FlowMissing';
import { type DateAvailability, SlotPicker } from '@/components/booking/SlotPicker';
import { InfoRow, ServiceSummary, SummaryCard } from '@/components/booking/Summary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookableDates, useSlotsByDate } from '@/data/queries';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { useFormat } from '@/hooks/useFormat';
import { bookingFlowRoutes } from '@/lib/bookingFlow';
import { firstAvailableDate, isSlotStillAvailable } from '@/lib/slots';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * Booking step 2 — arrival window. Dates and windows come from the API, which
 * applies the shared scheduling rules (working hours, Friday start, lead time,
 * technician availability). The chosen window is kept in the `slot` parameter.
 */
export default function BookScheduleScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { flow, service, selections, address, isPending, isError, refetch } = useBookingFlow();
  const dates = useBookableDates();

  const serviceId = flow?.serviceId;
  const addressId = flow?.addressId;
  const request = useMemo(
    () => (serviceId && addressId && selections ? { serviceId, selections, addressId } : null),
    [serviceId, addressId, selections],
  );
  const results = useSlotsByDate(dates.data, request);
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

  const [pickedDate, setPickedDate] = useState<string | undefined>(() =>
    flow?.slot ? kuwaitDateOf(flow.slot) : undefined,
  );
  const allLoaded = results.length > 0 && results.every((r) => !r.isPending);
  const firstOpen = firstAvailableDate(
    dates.data ?? [],
    new Map([...availability].map(([d, a]) => [d, a.slots])),
  );
  const selectedDate = pickedDate ?? firstOpen ?? (allLoaded ? dates.data?.[0] : undefined);
  const noAvailability = allLoaded && results.every((r) => r.isSuccess) && !firstOpen;

  // A window chosen earlier is only kept while the API still offers it.
  const slotDaySlots = flow?.slot ? availability.get(kuwaitDateOf(flow.slot))?.slots : undefined;
  const slotValid = isSlotStillAvailable(flow?.slot, slotDaySlots);
  const slotLost = !!flow?.slot && slotDaySlots !== undefined && !slotValid;
  const selectedSlot = slotValid ? flow?.slot : undefined;
  const chosen = selectedSlot
    ? slotDaySlots?.find((s) => Date.parse(s.start) === Date.parse(selectedSlot))
    : undefined;

  if (!flow || !flow.addressId) return <FlowMissing />;

  return (
    <Screen
      header={
        <FlowHeader
          step={2}
          title={t('bookFlow.scheduleTitle')}
          subtitle={t('bookFlow.scheduleSubtitle')}
          fallbackHref={bookingFlowRoutes.address(flow)}
        />
      }
      footer={
        <View style={styles.footer}>
          {chosen ? (
            <Text variant="callout" tone="secondary" align="center" numberOfLines={1}>
              {t('bookFlow.selected', {
                date: f.date(chosen.start, 'dayMonth'),
                range: f.timeRange(chosen.start, chosen.end),
              })}
            </Text>
          ) : null}
          <Button
            label={t('bookFlow.continue')}
            trailingIcon={ArrowRight}
            fullWidth
            disabled={!selectedSlot}
            onPress={() =>
              selectedSlot &&
              router.push(
                bookingFlowRoutes.checkout({
                  ...flow,
                  addressId: flow.addressId!,
                  slot: selectedSlot,
                }),
              )
            }
          />
        </View>
      }
    >
      {isPending ? (
        <Skeleton height={140} rounded={radius.xl} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : service.data && selections ? (
        <SummaryCard>
          <ServiceSummary service={service.data} selections={selections} />
          {address ? (
            <InfoRow
              icon={MapPin}
              label={addressTitle(address, locale)}
              value={f.address(address, 'short')}
              onChange={() => router.back()}
            />
          ) : null}
        </SummaryCard>
      ) : null}

      {slotLost ? (
        <Card tone="muted">
          <Text variant="callout" style={{ color: colors.warning }}>
            {t('bookFlow.slotTaken')}
          </Text>
        </Card>
      ) : null}

      {dates.isPending ? (
        <Skeleton height={300} rounded={radius.xl} />
      ) : dates.isError ? (
        <ErrorState onRetry={() => void dates.refetch()} />
      ) : (dates.data ?? []).length === 0 || noAvailability ? (
        <EmptyState
          icon={CalendarX2}
          title={t('bookFlow.noDatesTitle')}
          body={t('bookFlow.noDatesBody')}
          actionLabel={t('bookFlow.change')}
          onAction={() => router.back()}
        />
      ) : (
        <>
          <SlotPicker
            dates={dates.data ?? []}
            availability={availability}
            selectedDate={selectedDate}
            onSelectDate={(date) => setPickedDate(date)}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => router.setParams({ slot: slot.start })}
          />
          <Text variant="caption" tone="muted" align="center">
            {t('bookFlow.leadNote', { hours: businessConfig.minLeadTimeMinutes / 60 })}
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.sm },
});
