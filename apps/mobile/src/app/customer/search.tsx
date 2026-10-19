import { router } from 'expo-router';
import { ArrowLeft, Clock, SearchX, Sparkles } from '@/components/ui/icons';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { categoryIcons } from '@/components/catalog/categoryIcons';
import { ServiceRow } from '@/components/catalog/ServiceRow';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { SectionHeader } from '@/components/ui/Headers';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useCategories, usePopularServices, useServiceSearch } from '@/data/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useRecentSearches } from '@/services/recentSearches';
import { gutter, space } from '@/theme/tokens';

export default function SearchScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 250);
  const search = useServiceSearch(debounced);
  const popular = usePopularServices();
  const categories = useCategories();
  const recent = useRecentSearches();

  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, f.text(c.name)]));
  const openService = (id: string) => {
    recent.remember(query);
    router.push(customerRoutes.service(id));
  };
  const openCategory = (id: string) => {
    recent.remember(query);
    router.push(customerRoutes.category(id));
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/customer'));

  const showIdle = debounced.length === 0;
  const results = search.data;
  const noResults =
    !showIdle && results && results.services.length === 0 && results.categories.length === 0;

  const popularChips = (
    <ChipRow>
      {(popular.data ?? []).slice(0, 8).map((s) => (
        <Chip key={s.id} label={f.text(s.name)} icon={Sparkles} onPress={() => openService(s.id)} />
      ))}
    </ChipRow>
  );

  return (
    <Screen
      header={
        <SafeAreaView edges={[]} style={styles.header}>
          <IconButton icon={ArrowLeft} directional label={t('common.back')} onPress={goBack} />
          <View style={styles.field}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('search.placeholder')}
              clearLabel={t('search.clear')}
              accessibilityLabel={t('search.placeholder')}
              autoFocus
              onSubmitEditing={() => recent.remember(query)}
            />
          </View>
        </SafeAreaView>
      }
    >
      {showIdle ? (
        <>
          {recent.items.length ? (
            <View style={styles.section}>
              <SectionHeader
                title={t('search.recent')}
                actionLabel={t('search.clearRecent')}
                onAction={recent.clear}
              />
              <View style={styles.recentList}>
                {recent.items.map((item) => (
                  <PressableScale
                    key={item}
                    onPress={() => setQuery(item)}
                    accessibilityLabel={item}
                    style={[styles.recentRow, { borderBottomColor: colors.hairline }]}
                  >
                    <Clock size={16} color={colors.textMuted} strokeWidth={1.75} />
                    <Text variant="body" style={styles.flex} numberOfLines={1}>
                      {item}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.section}>
            <SectionHeader title={t('search.popular')} />
            {popularChips}
          </View>
          <View style={styles.section}>
            <SectionHeader
              title={t('search.browse')}
              actionLabel={t('common.seeAll')}
              onAction={() => router.push(customerRoutes.categories)}
            />
            <FlatList
              horizontal
              data={categories.data ?? []}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.carousel}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <CategoryCard category={item} onPress={() => openCategory(item.id)} />
              )}
            />
          </View>
        </>
      ) : search.isError ? (
        <ErrorState onRetry={() => void search.refetch()} />
      ) : !results ? (
        <SkeletonList count={4} height={104} />
      ) : noResults ? (
        <>
          <EmptyState
            icon={SearchX}
            title={t('search.noResultsTitle', { query: debounced })}
            body={t('search.noResultsBody')}
          />
          <View style={styles.section}>
            <SectionHeader title={t('search.popular')} />
            {popularChips}
          </View>
        </>
      ) : (
        <>
          {results.categories.length ? (
            <View style={styles.section}>
              <Text variant="overline" tone="muted">
                {t('search.categories')}
              </Text>
              <ChipRow>
                {results.categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={f.text(c.name)}
                    icon={categoryIcons[c.icon]}
                    onPress={() => openCategory(c.id)}
                  />
                ))}
              </ChipRow>
            </View>
          ) : null}
          {results.services.length ? (
            <View style={styles.section}>
              <Text variant="overline" tone="muted" accessibilityLiveRegion="polite">
                {t('search.services', { count: results.services.length })}
              </Text>
              <View style={styles.list}>
                {results.services.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    eyebrow={categoryName.get(service.categoryId)}
                    onPress={() => openService(service.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingVertical: space.md,
  },
  field: { flex: 1 },
  section: { gap: space.md },
  recentList: { gap: 0 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  flex: { flex: 1 },
  bleed: { marginHorizontal: -gutter },
  carousel: { paddingHorizontal: gutter, gap: space.md },
  list: { gap: space.md },
});
