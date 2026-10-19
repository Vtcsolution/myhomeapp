import { router } from 'expo-router';
import { ArrowRight, MapPinned, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AddressCard } from '@/components/address/AddressCard';
import { FlowHeader } from '@/components/booking/FlowHeader';
import { FlowMissing } from '@/components/booking/FlowMissing';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { bookingFlowRoutes } from '@/lib/bookingFlow';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { space } from '@/theme/tokens';

/**
 * Booking step 1 — where the visit takes place. The selection lives in the
 * `addressId` route parameter, so going back and forth keeps it.
 */
export default function BookAddressScreen() {
  const { t } = useLocale();
  const { flow, profile } = useBookingFlow();
  const addresses = profile.data?.addresses ?? [];
  const selectedId =
    flow?.addressId && addresses.some((a) => a.id === flow.addressId)
      ? flow.addressId
      : (addresses.find((a) => a.isDefault) ?? addresses[0])?.id;

  if (!flow) return <FlowMissing />;

  const select = (addressId: string) => router.setParams({ addressId });
  const add = () => router.push(customerRoutes.addressForm({ from: 'booking' }));

  return (
    <Screen
      header={
        <FlowHeader
          step={1}
          title={t('bookFlow.addressTitle')}
          subtitle={t('bookFlow.addressSubtitle')}
          fallbackHref={customerRoutes.service(flow.serviceId)}
        />
      }
      refreshing={profile.isRefetching}
      onRefresh={() => void profile.refetch()}
      footer={
        <Button
          label={t('bookFlow.useAddress')}
          trailingIcon={ArrowRight}
          fullWidth
          disabled={!selectedId}
          onPress={() =>
            selectedId &&
            router.push(bookingFlowRoutes.schedule({ ...flow, addressId: selectedId }))
          }
        />
      }
    >
      {profile.isPending ? (
        <SkeletonList count={2} height={110} />
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={t('addresses.emptyTitle')}
          body={t('addresses.emptyBody')}
          actionLabel={t('addresses.add')}
          onAction={add}
        />
      ) : (
        <View style={styles.list} accessibilityRole="radiogroup">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={address.id === selectedId}
              onSelect={() => select(address.id)}
              onEdit={() =>
                router.push(customerRoutes.addressForm({ id: address.id, from: 'booking' }))
              }
            />
          ))}
          <Button
            label={t('addresses.add')}
            icon={Plus}
            variant="secondary"
            fullWidth
            onPress={add}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
