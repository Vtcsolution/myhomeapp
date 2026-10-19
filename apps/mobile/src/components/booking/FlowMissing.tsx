import { router } from 'expo-router';
import { RotateCcw } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/StateViews';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';

/** Shown when a booking step is opened without the details of earlier steps (e.g. a stale link). */
export function FlowMissing() {
  const { t } = useLocale();
  return (
    <Screen header={<ScreenHeader back fallbackHref="/customer" />}>
      <EmptyState
        icon={RotateCcw}
        title={t('checkout.missing')}
        actionLabel={t('service.browse')}
        onAction={() => router.replace(customerRoutes.categories)}
      />
    </Screen>
  );
}
