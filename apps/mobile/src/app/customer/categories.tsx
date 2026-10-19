import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CategoryTile } from '@/components/catalog/CategoryTile';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateViews';
import { useAllServices, useCategories } from '@/data/queries';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { radius, space } from '@/theme/tokens';

/** Every category as a two-column photographic grid. */
export default function CategoriesScreen() {
  const { t } = useLocale();
  const categories = useCategories();
  const services = useAllServices();
  const counts = new Map<string, number>();
  for (const s of services.data ?? [])
    counts.set(s.categoryId, (counts.get(s.categoryId) ?? 0) + 1);

  const rows: (typeof categories.data)[] = [];
  for (let i = 0; i < (categories.data?.length ?? 0); i += 2)
    rows.push(categories.data?.slice(i, i + 2));

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/customer"
          title={t('categories.title')}
          subtitle={t('categories.subtitle')}
        />
      }
      refreshing={categories.isRefetching}
      onRefresh={() => void categories.refetch()}
      contentStyle={styles.content}
    >
      {categories.isPending ? (
        <View style={styles.grid}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton height={190} rounded={radius.xl} style={styles.flex} />
              <Skeleton height={190} rounded={radius.xl} style={styles.flex} />
            </View>
          ))}
        </View>
      ) : categories.isError ? (
        <ErrorState onRetry={() => void categories.refetch()} />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, index) => (
            <View key={index} style={styles.row}>
              {row?.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  caption={
                    counts.has(category.id)
                      ? t('categories.count', { count: counts.get(category.id) ?? 0 })
                      : undefined
                  }
                  onPress={() => router.push(customerRoutes.category(category.id))}
                />
              ))}
              {row?.length === 1 ? <View style={styles.flex} /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  grid: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
