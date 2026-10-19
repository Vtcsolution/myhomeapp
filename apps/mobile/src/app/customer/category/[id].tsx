import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDownWideNarrow, SearchX } from '@/components/ui/icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ServiceRow } from '@/components/catalog/ServiceRow';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/Headers';
import { HeroScreen } from '@/components/ui/HeroScreen';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useCategory, useCategoryServices } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import {
  availablePricingFilters,
  filterByPricing,
  type PricingFilter,
  type ServiceSort,
  sortServices,
} from '@/lib/serviceFilters';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import type { TKey } from '@/i18n/translate';

const SORTS: [ServiceSort, TKey][] = [
  ['popular', 'category.sortPopular'],
  ['price_asc', 'category.sortPriceLow'],
  ['price_desc', 'category.sortPriceHigh'],
  ['rating', 'category.sortRating'],
];

const FILTER_LABELS: Record<PricingFilter, TKey> = {
  all: 'category.filterAll',
  fixed: 'category.filterFixed',
  unit: 'category.filterUnit',
  inspection: 'category.filterInspection',
};

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const category = useCategory(id);
  const services = useCategoryServices(id);
  const [sort, setSort] = useState<ServiceSort>('popular');
  const [filter, setFilter] = useState<PricingFilter>('all');

  const filters = useMemo(() => availablePricingFilters(services.data ?? []), [services.data]);
  const list = useMemo(
    () => sortServices(filterByPricing(services.data ?? [], filter), sort),
    [services.data, filter, sort],
  );

  if (category.isPending) {
    return (
      <Screen header={<ScreenHeader back fallbackHref={customerRoutes.categories} />}>
        <Skeleton height={220} rounded={radius.xxl} />
        <SkeletonList count={3} height={104} />
      </Screen>
    );
  }
  if (category.isError) {
    return (
      <Screen header={<ScreenHeader back fallbackHref={customerRoutes.categories} />}>
        <EmptyState
          icon={SearchX}
          title={t('category.notFound')}
          actionLabel={t('search.browse')}
          onAction={() => router.replace(customerRoutes.categories)}
        />
      </Screen>
    );
  }

  const c = category.data;
  return (
    <HeroScreen
      media={c.image}
      fallbackHref={customerRoutes.categories}
      heroHeight={300}
      overlay={
        <>
          {services.data ? (
            <Text variant="overline" style={{ color: colors.champagne }}>
              {t('categories.count', { count: services.data.length })}
            </Text>
          ) : null}
          <Text variant="display" style={{ color: colors.onMidnight }} accessibilityRole="header">
            {f.text(c.name)}
          </Text>
          <Text variant="callout" style={{ color: 'rgba(251,248,243,0.82)' }}>
            {f.text(c.description)}
          </Text>
        </>
      }
    >
      <View style={styles.controls}>
        <View style={styles.sortLabel}>
          <ArrowDownWideNarrow size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="captionStrong" tone="muted">
            {t('category.sortLabel')}
          </Text>
        </View>
        <ChipRow>
          {SORTS.map(([value, label]) => (
            <Chip
              key={value}
              label={t(label)}
              selected={sort === value}
              onPress={() => setSort(value)}
            />
          ))}
        </ChipRow>
        {filters.length ? (
          <ChipRow>
            {filters.map((value) => (
              <Chip
                key={value}
                label={t(FILTER_LABELS[value])}
                selected={filter === value}
                onPress={() => setFilter(value)}
              />
            ))}
          </ChipRow>
        ) : null}
      </View>

      {services.isPending ? (
        <SkeletonList count={3} height={104} />
      ) : services.isError ? (
        <ErrorState onRetry={() => void services.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t('category.emptyTitle')}
          body={t('category.emptyBody')}
          actionLabel={t('category.showAll')}
          onAction={() => setFilter('all')}
        />
      ) : (
        <View style={styles.list}>
          {list.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onPress={() => router.push(customerRoutes.service(service.id))}
            />
          ))}
        </View>
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: space.md },
  sortLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  list: { gap: space.md },
});
