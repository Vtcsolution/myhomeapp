import { router, useLocalSearchParams } from 'expo-router';
import { Info, MapPin, PencilLine, SearchX } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PriceSummary } from '@/components/service/PriceSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Photo } from '@/components/ui/Photo';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useCategory, useQuote, useService } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { usePricingLabel } from '@/hooks/usePricingLabel';
import { bookingFlowRoutes } from '@/lib/bookingFlow';
import { decodeSelections, encodeSelections } from '@/lib/selectionCodec';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * Booking review — check the configured service. The selection arrives from
 * the service screen (validated again here) and the price is quoted by the API.
 */
export default function BookReviewScreen() {
  const { serviceId, selections: raw } = useLocalSearchParams<{
    serviceId: string;
    selections?: string;
  }>();
  const { t, brandName } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const pricingLabel = usePricingLabel();
  const service = useService(serviceId);
  const category = useCategory(service.data?.categoryId);

  const decoded = useMemo(
    () => (service.data ? decodeSelections(raw, service.data) : undefined),
    [raw, service.data],
  );
  const quote = useQuote(service.data?.id, decoded?.selections);

  const edit = () => {
    if (router.canGoBack()) router.back();
    else if (service.data && decoded) router.replace(customerRoutes.service(service.data.id));
  };

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

  const s = service.data;
  const selections = decoded?.selections;
  const chosenOptions =
    s && selections
      ? s.optionGroups
          .map((g) => ({
            group: g,
            choice: g.choices.find((c) => c.id === selections.options[g.id]),
          }))
          .filter((x) => x.choice)
      : [];
  const chosenAddOns =
    s && selections ? s.addOns.filter((a) => selections.addOnIds.includes(a.id)) : [];

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/customer"
          title={t('book.title')}
          subtitle={t('book.subtitle')}
        />
      }
      footer={
        <View style={styles.footer}>
          <Button
            label={t('book.continue')}
            icon={MapPin}
            fullWidth
            disabled={!quote.data}
            onPress={() =>
              s &&
              selections &&
              router.push(
                bookingFlowRoutes.address({
                  serviceId: s.id,
                  selections: encodeSelections(selections),
                }),
              )
            }
          />
          <Button
            label={t('book.edit')}
            variant="ghost"
            size="md"
            icon={PencilLine}
            onPress={edit}
          />
        </View>
      }
    >
      {!s || !selections ? (
        <>
          <Skeleton height={120} rounded={radius.xl} />
          <SkeletonList count={2} height={140} />
        </>
      ) : (
        <>
          {raw && decoded?.usedDefaults ? (
            <Card tone="muted">
              <View style={styles.notice}>
                <Info size={18} color={colors.warning} strokeWidth={1.75} />
                <Text variant="callout" tone="secondary" style={styles.flex}>
                  {t('book.reset')}
                </Text>
              </View>
            </Card>
          ) : null}

          <Card>
            <View style={styles.serviceRow}>
              <Photo media={s.image} style={styles.thumb} />
              <View style={styles.flex}>
                {category.data ? (
                  <Text variant="overline" tone="accent">
                    {f.text(category.data.name)}
                  </Text>
                ) : null}
                <Text variant="title3">{f.text(s.name)}</Text>
                <Text variant="caption" tone="muted">
                  {pricingLabel(s)}
                </Text>
              </View>
            </View>
            <View style={[styles.details, { borderTopColor: colors.hairline }]}>
              {s.pricingModel === 'per_unit' || s.pricingModel === 'hourly' ? (
                <Detail
                  label={s.unitLabel ? f.text(s.unitLabel) : ''}
                  value={`× ${selections.units}`}
                />
              ) : null}
              {chosenOptions.map(({ group, choice }) => (
                <Detail
                  key={group.id}
                  label={f.text(group.label)}
                  value={choice ? f.text(choice.label) : ''}
                />
              ))}
              <Detail
                label={t('book.addOns')}
                value={
                  chosenAddOns.length
                    ? chosenAddOns.map((a) => f.text(a.name)).join(', ')
                    : t('book.none')
                }
              />
              {quote.data ? (
                <Detail
                  label={t('service.estimate')}
                  value={f.duration(quote.data.price.estimatedDurationMin)}
                />
              ) : null}
            </View>
          </Card>

          {quote.isPending ? (
            <Skeleton height={220} rounded={radius.xl} />
          ) : quote.isError ? (
            <ErrorState onRetry={() => void quote.refetch()} />
          ) : (
            <>
              <PriceSummary price={quote.data.price} />
              <Text variant="caption" tone="muted" align="center">
                {t('book.quoteNote', { brand: brandName })}
              </Text>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="callout" tone="secondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="calloutStrong" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: space.xs, alignItems: 'center' },
  notice: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  serviceRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  details: {
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: space.sm,
  },
  detail: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  detailValue: { flexShrink: 1, maxWidth: '60%' },
});
