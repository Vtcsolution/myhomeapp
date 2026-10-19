import { router } from 'expo-router';
import { MapPinned, Plus } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AddressCard } from '@/components/address/AddressCard';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useCustomerProfile, useDeleteAddress, useSetDefaultAddress } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

/** Manage saved addresses (Account → Saved addresses, Home → address chip). */
export default function AddressesScreen() {
  const { t } = useLocale();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const profile = useCustomerProfile();
  const remove = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const addresses = profile.data?.addresses ?? [];

  const openForm = (id?: string) =>
    router.push({ pathname: '/customer/address-form', params: id ? { id } : {} });

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/customer/account"
          title={t('addresses.title')}
          subtitle={t('addresses.subtitle')}
        />
      }
      refreshing={profile.isRefetching}
      onRefresh={() => void profile.refetch()}
      footer={
        <Button label={t('addresses.add')} icon={Plus} fullWidth onPress={() => openForm()} />
      }
    >
      {profile.isPending ? (
        <SkeletonList count={2} height={130} />
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={t('addresses.emptyTitle')}
          body={t('addresses.emptyBody')}
        />
      ) : (
        <View style={styles.list}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => openForm(address.id)}
              onDelete={() => setPendingDelete(address.id)}
              onSetDefault={() =>
                setDefault.mutate(address.id, {
                  onSuccess: () => show(t('addresses.defaultSet'), 'success'),
                  onError: (e) => show(errorMessage(e)),
                })
              }
            />
          ))}
        </View>
      )}
      <ConfirmDialog
        visible={pendingDelete !== null}
        title={t('addresses.deleteTitle')}
        body={t('addresses.deleteBody')}
        confirmLabel={t('addresses.delete')}
        destructive
        loading={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() =>
          pendingDelete &&
          remove.mutate(pendingDelete, {
            onSuccess: () => {
              setPendingDelete(null);
              show(t('addresses.deleted'), 'success');
            },
            onError: (e) => show(errorMessage(e)),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
