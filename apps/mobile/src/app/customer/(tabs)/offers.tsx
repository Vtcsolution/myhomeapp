import { TicketPercent } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { OfferCard } from '@/components/offers/OfferCard';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useCustomerOffers } from '@/data/queries';
import { useLocale } from '@/providers/LocaleProvider';
import { space } from '@/theme/tokens';

export default function OffersScreen() {
  const { t } = useLocale();
  const offers = useCustomerOffers();
  return (
    <Screen
      header={<ScreenHeader title={t('offers.title')} subtitle={t('offers.subtitle')} />}
      refreshing={offers.isRefetching}
      onRefresh={() => void offers.refetch()}
    >
      {offers.isPending ? (
        <SkeletonList count={3} height={140} />
      ) : offers.isError ? (
        <ErrorState onRetry={() => void offers.refetch()} />
      ) : offers.data.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title={t('offers.emptyTitle')}
          body={t('offers.emptyBody')}
        />
      ) : (
        <View style={styles.list}>
          {offers.data.map((coupon) => (
            <OfferCard key={coupon.id} coupon={coupon} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
