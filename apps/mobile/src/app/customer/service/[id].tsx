import {
  type BookingSelections,
  calculatePrice,
  defaultSelections,
  isUnitPriced,
  type Service,
} from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Check, Clock, Receipt, SearchX, Star, X } from '@/components/ui/icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SERVICE_CARD_WIDTH, ServiceCard } from '@/components/catalog/ServiceCard';
import { AddOnList } from '@/components/service/AddOnList';
import { OptionGroupPicker } from '@/components/service/OptionGroupPicker';
import { PriceSummary } from '@/components/service/PriceSummary';
import { ReviewList } from '@/components/service/ReviewList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader, SectionHeader } from '@/components/ui/Headers';
import { HeroScreen } from '@/components/ui/HeroScreen';
import { PressableScale } from '@/components/ui/Pressable';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useCategory, useCategoryServices, useServiceReviews, useService } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { usePricingLabel } from '@/hooks/usePricingLabel';
import { decodeSelections } from '@/lib/selectionCodec';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';

export default function ServiceDetailScreen() {
  const { id, selections: raw } = useLocalSearchParams<{ id: string; selections?: string }>();
  const { t } = useLocale();
  const service = useService(id);

  if (service.isPending) {
    return (
      <Screen header={<ScreenHeader back fallbackHref="/customer" />}>
        <Skeleton height={260} rounded={radius.xxl} />
        <SkeletonList count={3} height={72} />
      </Screen>
    );
  }
  if (service.isError) {
    return (
      <Screen header={<ScreenHeader back fallbackHref="/customer" />}>
        <EmptyState
          icon={SearchX}
          title={t('service.notFound')}
          actionLabel={t('service.browse')}
          onAction={() => router.replace(customerRoutes.categories)}
        />
      </Screen>
    );
  }
  return <ServiceDetail key={service.data.id} service={service.data} initial={raw} />;
}

function ServiceDetail({ service, initial }: { service: Service; initial: string | undefined }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const pricingLabel = usePricingLabel();
  const category = useCategory(service.categoryId);
  const siblings = useCategoryServices(service.categoryId);
  const reviews = useServiceReviews(service.id, 3);

  const [selections, setSelections] = useState<BookingSelections>(() =>
    initial ? decodeSelections(initial, service).selections : defaultSelections(service),
  );
  // The shared pricing engine is the single source of truth for every figure shown.
  const price = useMemo(() => calculatePrice({ service, selections }), [service, selections]);
  const related = (siblings.data ?? []).filter((s) => s.id !== service.id).slice(0, 6);
  const unitPriced = isUnitPriced(service);
  // Small phones stack the price above a full-width button.
  const compactFooter = useWindowDimensions().width < 360;

  const facts = [
    { icon: Receipt, label: pricingLabel(service) },
    {
      icon: Clock,
      label: t('service.duration', { duration: f.duration(price.estimatedDurationMin) }),
    },
    ...(service.warrantyDays > 0
      ? [{ icon: BadgeCheck, label: t('service.warranty', { count: service.warrantyDays }) }]
      : []),
  ];

  return (
    <HeroScreen
      media={service.image}
      fallbackHref={customerRoutes.category(service.categoryId)}
      overlay={
        <>
          {category.data ? (
            <PressableScale
              onPress={() => router.push(customerRoutes.category(service.categoryId))}
              accessibilityLabel={f.text(category.data.name)}
              style={[styles.categoryChip, { borderColor: 'rgba(217,188,138,0.7)' }]}
            >
              <Text variant="captionStrong" style={{ color: colors.champagne }}>
                {f.text(category.data.name)}
              </Text>
            </PressableScale>
          ) : null}
          <Text variant="display" style={{ color: colors.onMidnight }} accessibilityRole="header">
            {f.text(service.name)}
          </Text>
          <View style={styles.ratingRow}>
            {service.reviewsCount > 0 ? (
              <>
                <Star
                  size={14}
                  color={colors.champagne}
                  fill={colors.champagne}
                  strokeWidth={1.5}
                />
                <Text variant="calloutStrong" style={{ color: colors.onMidnight }}>
                  {f.rating(service.rating)}
                </Text>
                <Text variant="caption" style={{ color: 'rgba(251,248,243,0.75)' }}>
                  {t('home.reviews', { count: service.reviewsCount })} ·{' '}
                  {t('service.booked', { count: service.bookingsCount })}
                </Text>
              </>
            ) : (
              <Text variant="caption" style={{ color: 'rgba(251,248,243,0.75)' }}>
                {t('service.booked', { count: service.bookingsCount })}
              </Text>
            )}
          </View>
        </>
      }
      footer={
        <View style={[styles.footer, compactFooter && styles.footerStacked]}>
          <View style={styles.footerPrice}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t('service.total')}
            </Text>
            <Text variant="title2" numberOfLines={1} accessibilityLiveRegion="polite">
              {f.money(price.total)}
            </Text>
          </View>
          <Button
            label={t('service.continue')}
            size="md"
            onPress={() => router.push(customerRoutes.book(service.id, selections))}
            {...(compactFooter ? {} : { style: styles.footerButton })}
          />
        </View>
      }
    >
      <View style={styles.facts}>
        {facts.map(({ icon: Icon, label }) => (
          <View
            key={label}
            style={[styles.fact, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          >
            <Icon size={16} color={colors.accent} strokeWidth={1.75} />
            <Text variant="captionStrong" numberOfLines={2} style={styles.factText}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('service.about')} />
        <Text variant="body" tone="secondary">
          {f.text(service.description)}
        </Text>
      </View>

      {service.includes.length ? (
        <View style={styles.section}>
          <Text variant="title3">{t('service.included')}</Text>
          {service.includes.map((item) => (
            <View key={item.en} style={styles.listItem}>
              <Check size={16} color={colors.success} strokeWidth={2} />
              <Text variant="callout" style={styles.flex}>
                {f.text(item)}
              </Text>
            </View>
          ))}
          {service.excludes.length ? (
            <>
              <Text variant="title3" style={styles.excludedTitle}>
                {t('service.excluded')}
              </Text>
              {service.excludes.map((item) => (
                <View key={item.en} style={styles.listItem}>
                  <X size={16} color={colors.textMuted} strokeWidth={2} />
                  <Text variant="callout" tone="secondary" style={styles.flex}>
                    {f.text(item)}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      {unitPriced || service.optionGroups.length || service.addOns.length ? (
        <View style={styles.section}>
          <SectionHeader title={t('service.configure')} />
          {unitPriced ? (
            <Card>
              <View style={styles.quantity}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{t('service.quantity')}</Text>
                  {service.unitLabel ? (
                    <Text variant="caption" tone="muted">
                      {f.money(service.basePrice)} {f.text(service.unitLabel)}
                    </Text>
                  ) : null}
                </View>
                <QuantityStepper
                  value={selections.units}
                  min={service.minUnits}
                  max={service.maxUnits}
                  onChange={(units) => setSelections((s) => ({ ...s, units }))}
                />
              </View>
            </Card>
          ) : null}
          {service.optionGroups.map((group) => (
            <OptionGroupPicker
              key={group.id}
              service={service}
              group={group}
              selectedId={selections.options[group.id]}
              onSelect={(choiceId) =>
                setSelections((s) => ({ ...s, options: { ...s.options, [group.id]: choiceId } }))
              }
            />
          ))}
          {service.addOns.length ? (
            <View style={styles.subsection}>
              <Text variant="captionStrong" tone="secondary">
                {t('service.addOns')} · {t('service.optional')}
              </Text>
              <AddOnList
                addOns={service.addOns}
                selectedIds={selections.addOnIds}
                onToggle={(addOnId) =>
                  setSelections((s) => ({
                    ...s,
                    addOnIds: s.addOnIds.includes(addOnId)
                      ? s.addOnIds.filter((x) => x !== addOnId)
                      : [...s.addOnIds, addOnId],
                  }))
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <PriceSummary price={price} />

      <View style={styles.section}>
        <SectionHeader title={t('service.reviews')} />
        {reviews.isPending ? (
          <SkeletonList count={2} height={110} />
        ) : service.reviewsCount > 0 && reviews.data?.length ? (
          <ReviewList rating={service.rating} count={service.reviewsCount} reviews={reviews.data} />
        ) : (
          <Text variant="callout" tone="muted">
            {t('service.noReviews')}
          </Text>
        )}
      </View>

      {related.length ? (
        <View style={styles.section}>
          <SectionHeader title={t('service.related')} />
          <FlatList
            horizontal
            data={related}
            keyExtractor={(s) => s.id}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.carousel}
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
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  categoryChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    backgroundColor: 'rgba(15,29,43,0.45)',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, flexWrap: 'wrap' },
  facts: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 140,
  },
  factText: { flexShrink: 1 },
  section: { gap: space.md },
  subsection: { gap: space.sm },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  excludedTitle: { marginTop: space.sm },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  footerStacked: { flexDirection: 'column', alignItems: 'stretch', gap: space.sm },
  footerPrice: { flexShrink: 0, gap: 2 },
  footerButton: { flex: 1 },
  bleed: { marginHorizontal: -gutter },
  carousel: { paddingHorizontal: gutter, gap: space.md },
});
