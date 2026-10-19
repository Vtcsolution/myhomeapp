import { isLiveStatus } from '@myhome/shared';
import { useMemo } from 'react';
import { router } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  MapPin,
  Receipt,
  Search,
  ShieldCheck,
} from '@/components/ui/icons';
import { FlatList, StyleSheet, View } from 'react-native';
import { LiveBookingCard } from '@/components/booking/LiveBookingCard';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { PromoCarousel } from '@/components/catalog/PromoCarousel';
import { SERVICE_CARD_WIDTH, ServiceCard } from '@/components/catalog/ServiceCard';
import { ServiceRow } from '@/components/catalog/ServiceRow';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Headers';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import {
  useAllServices,
  useCategories,
  useCustomerBookings,
  useCustomerProfile,
  usePopularServices,
  usePromotions,
  useUnreadCount,
} from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useGreeting } from '@/hooks/useGreeting';
import { useNow } from '@/hooks/useNow';
import { bookAgain, recommended } from '@/lib/recommendations';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';

export default function CustomerHome() {
  const { t, brandName } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const now = useNow();

  const profile = useCustomerProfile();
  const promotions = usePromotions();
  const categories = useCategories();
  const popular = usePopularServices();
  const active = useCustomerBookings('active');
  const all = useCustomerBookings('all');
  const services = useAllServices();
  const unread = useUnreadCount();
  const greeting = useGreeting(profile.data?.fullName);

  const address = profile.data?.addresses.find((a) => a.isDefault) ?? profile.data?.addresses[0];
  const live = active.data?.find((b) => isLiveStatus(b.status));
  // Personalised rails derived from the customer's own bookings.
  const again = useMemo(
    () => bookAgain(all.data ?? [], services.data ?? []),
    [all.data, services.data],
  );
  const forYou = useMemo(
    () => recommended(all.data ?? [], services.data ?? []),
    [all.data, services.data],
  );
  const refreshing = profile.isRefetching || categories.isRefetching || active.isRefetching;
  const refresh = () => {
    void profile.refetch();
    void promotions.refetch();
    void categories.refetch();
    void popular.refetch();
    void active.refetch();
    void all.refetch();
    void services.refetch();
    void unread.refetch();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} contentStyle={styles.content}>
      {/* Greeting, address and notifications */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="overline" tone="muted">
            {f.date(now, 'full')}
          </Text>
          {profile.isPending ? (
            <Skeleton width={220} height={30} />
          ) : (
            <Text variant="title1" numberOfLines={2}>
              {greeting}
            </Text>
          )}
        </View>
        <IconButton
          icon={Bell}
          label={t('notifications.title')}
          badge={unread.data}
          onPress={() => router.push('/customer/notifications')}
        />
      </View>

      <PressableScale
        onPress={() => router.push(customerRoutes.addresses)}
        accessibilityLabel={address ? f.address(address, 'full') : t('home.addressFallback')}
        // The chip is 20 pt tall; extend the touch area to 44 pt.
        hitSlop={12}
        style={styles.address}
      >
        <MapPin size={16} color={colors.accent} strokeWidth={1.75} />
        <Text variant="calloutStrong" numberOfLines={1} style={styles.addressText}>
          {address ? f.address(address, 'short') : t('home.addressFallback')}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} strokeWidth={1.75} />
      </PressableScale>

      <PressableScale
        onPress={() => router.push(customerRoutes.search)}
        accessibilityRole="search"
        accessibilityLabel={t('home.searchPlaceholder')}
        style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
      >
        <Search size={18} color={colors.textMuted} strokeWidth={1.75} />
        <Text variant="body" tone="muted">
          {t('home.searchPlaceholder')}
        </Text>
      </PressableScale>

      {live ? (
        <LiveBookingCard
          booking={live}
          onPress={() => router.push(customerRoutes.booking(live.id))}
        />
      ) : null}

      {/* Offers */}
      <View style={styles.section}>
        <SectionHeader title={t('home.offers')} />
        {promotions.isPending ? (
          <Skeleton height={208} rounded={radius.xxl} />
        ) : promotions.isError ? (
          <ErrorState onRetry={() => void promotions.refetch()} />
        ) : (
          <PromoCarousel
            promotions={promotions.data}
            onPress={(promotion) => router.push(customerRoutes.promotion(promotion))}
          />
        )}
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <SectionHeader
          title={t('home.categories')}
          actionLabel={t('common.seeAll')}
          onAction={() => router.push(customerRoutes.categories)}
        />
        {categories.isPending ? (
          <View style={styles.row}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width={132} height={172} rounded={radius.xl} />
            ))}
          </View>
        ) : categories.isError ? (
          <ErrorState onRetry={() => void categories.refetch()} />
        ) : (
          <FlatList
            horizontal
            data={categories.data}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <CategoryCard
                category={item}
                onPress={() => router.push(customerRoutes.category(item.id))}
              />
            )}
          />
        )}
      </View>

      {/* Book again */}
      {again.length ? (
        <View style={styles.section}>
          <SectionHeader title={t('home.bookAgain')} />
          <FlatList
            horizontal
            data={again}
            keyExtractor={(item) => item.service.id}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.categoryList}
            snapToInterval={SERVICE_CARD_WIDTH + space.md}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <ServiceCard
                service={item.service}
                caption={t('home.lastBooked', { date: f.date(item.lastBookedAt, 'dayMonth') })}
                onPress={() => router.push(customerRoutes.service(item.service.id))}
              />
            )}
          />
        </View>
      ) : null}

      {/* Most booked */}
      <View style={styles.section}>
        <SectionHeader title={t('home.popular')} />
        {popular.isPending ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={104} rounded={radius.xl} />
            ))}
          </View>
        ) : popular.isError ? (
          <ErrorState onRetry={() => void popular.refetch()} />
        ) : (
          <View style={styles.list}>
            {popular.data.slice(0, 4).map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                onPress={() => router.push(customerRoutes.service(service.id))}
              />
            ))}
          </View>
        )}
      </View>

      {/* Recommended */}
      {forYou.length ? (
        <View style={styles.section}>
          <SectionHeader title={t('home.recommended')} />
          <FlatList
            horizontal
            data={forYou}
            keyExtractor={(s) => s.id}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.categoryList}
            snapToInterval={SERVICE_CARD_WIDTH + space.md}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                onPress={() => router.push(customerRoutes.service(item.id))}
              />
            )}
          />
        </View>
      ) : null}

      {/* Brand promise */}
      <Card tone="muted">
        <Text variant="title2" style={styles.standardTitle}>
          {t('home.standardTitle', { brand: brandName })}
        </Text>
        <View style={styles.list}>
          {(
            [
              [ShieldCheck, 'home.vettedTitle', 'home.vettedBody'],
              [Receipt, 'home.pricingTitle', 'home.pricingBody'],
              [BadgeCheck, 'home.warrantyTitle', 'home.warrantyBody'],
            ] as const
          ).map(([Icon, title, body]) => (
            <View key={title} style={styles.promise}>
              <View style={[styles.promiseIcon, { borderColor: colors.accent }]}>
                <Icon size={18} color={colors.accent} strokeWidth={1.75} />
              </View>
              <View style={styles.promiseText}>
                <Text variant="bodyStrong">{t(title)}</Text>
                <Text variant="callout" tone="secondary">
                  {t(body)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg, gap: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: -space.md,
    alignSelf: 'flex-start',
  },
  addressText: { flexShrink: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 54,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: -space.sm,
  },
  section: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  bleed: { marginHorizontal: -gutter },
  categoryList: { paddingHorizontal: gutter, gap: space.md },
  list: { gap: space.md },
  standardTitle: { marginBottom: space.lg },
  promise: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  promiseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: { flex: 1, gap: 2 },
});
