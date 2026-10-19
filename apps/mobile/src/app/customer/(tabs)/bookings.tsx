import { isFinalStatus, toMs } from '@myhome/shared';
import { router } from 'expo-router';
import { CalendarDays, History } from '@/components/ui/icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BookingCard } from '@/components/booking/BookingCard';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useCustomerBookings } from '@/data/queries';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { space } from '@/theme/tokens';

type Tab = 'upcoming' | 'past';

export default function BookingsScreen() {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>('upcoming');
  const all = useCustomerBookings('all');

  const list = useMemo(() => {
    const items = all.data ?? [];
    if (tab === 'past') return items.filter((b) => isFinalStatus(b.status));
    // Upcoming includes visits under way, soonest first.
    return items
      .filter((b) => !isFinalStatus(b.status))
      .sort((a, b) => toMs(a.scheduledStart) - toMs(b.scheduledStart));
  }, [all.data, tab]);

  return (
    <Screen
      header={<ScreenHeader title={t('bookings.title')} />}
      refreshing={all.isRefetching}
      onRefresh={() => void all.refetch()}
    >
      <SegmentedControl<Tab>
        accessibilityLabel={t('bookings.title')}
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'upcoming', label: t('bookings.upcoming') },
          { value: 'past', label: t('bookings.past') },
        ]}
      />
      {all.isPending ? (
        <SkeletonList count={3} height={150} />
      ) : all.isError ? (
        <ErrorState onRetry={() => void all.refetch()} />
      ) : list.length === 0 ? (
        tab === 'upcoming' ? (
          <EmptyState
            icon={CalendarDays}
            title={t('bookings.emptyUpcomingTitle')}
            body={t('bookings.emptyUpcomingBody')}
            actionLabel={t('bookings.explore')}
            onAction={() => router.push(customerRoutes.categories)}
          />
        ) : (
          <EmptyState
            icon={History}
            title={t('bookings.emptyPastTitle')}
            body={t('bookings.emptyPastBody')}
          />
        )
      ) : (
        <View style={styles.list}>
          {list.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(customerRoutes.booking(booking.id))}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
