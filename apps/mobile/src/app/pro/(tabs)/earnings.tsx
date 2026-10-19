import type { EarningsRange, PayoutStatus, StatusTone } from '@myhome/shared';
import { Building2, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EarningsBars } from '@/components/pro/EarningsBars';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScreenHeader, SectionHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useEarnings, useTechnicianProfile } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const payoutTone: Record<PayoutStatus, StatusTone> = {
  scheduled: 'neutral',
  processing: 'warning',
  paid: 'success',
};

export default function ProEarnings() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const [range, setRange] = useState<EarningsRange>('week');
  const earnings = useEarnings(range);
  const profile = useTechnicianProfile();
  const data = earnings.data;

  return (
    <Screen
      header={<ScreenHeader title={t('earnings.title')} />}
      refreshing={earnings.isRefetching}
      onRefresh={() => void earnings.refetch()}
    >
      <SegmentedControl<EarningsRange>
        accessibilityLabel={t('earnings.title')}
        value={range}
        onChange={setRange}
        segments={[
          { value: 'week', label: t('earnings.week') },
          { value: 'month', label: t('earnings.month') },
          { value: 'quarter', label: t('earnings.quarter') },
        ]}
      />

      {earnings.isPending ? (
        <Skeleton height={260} rounded={radius.xl} />
      ) : earnings.isError || !data ? (
        <ErrorState onRetry={() => void earnings.refetch()} />
      ) : (
        <>
          <Card tone="midnight">
            <Text variant="overline" style={{ color: colors.champagne }}>
              {t('earnings.net')}
            </Text>
            <Text variant="numeral" style={[styles.net, { color: colors.onMidnight }]}>
              {f.money(data.net)}
            </Text>
            <View style={[styles.breakdown, { borderTopColor: 'rgba(255,255,255,0.12)' }]}>
              {(
                [
                  [t('earnings.gross'), f.money(data.gross)],
                  [t('earnings.fee'), f.money(data.commission)],
                  [t('earnings.jobs'), String(data.jobs)],
                ] as const
              ).map(([label, value]) => (
                <View key={label} style={styles.breakdownItem}>
                  <Text variant="caption" style={{ color: 'rgba(251,248,243,0.64)' }}>
                    {label}
                  </Text>
                  <Text variant="calloutStrong" style={{ color: colors.onMidnight }}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text variant="captionStrong" tone="secondary" style={styles.chartTitle}>
              {t('earnings.daily')}
            </Text>
            <EarningsBars series={data.series} />
          </Card>

          <View style={styles.section}>
            <SectionHeader title={t('earnings.payouts')} />
            {data.paidBy === 'vendor' ? (
              <Card tone="muted">
                <View style={styles.vendor}>
                  <Building2 size={20} color={colors.accent} strokeWidth={1.75} />
                  <Text variant="callout" tone="secondary" style={styles.flex}>
                    {t('earnings.paidByVendor', {
                      vendor: profile.data?.vendor ? f.text(profile.data.vendor.name) : '',
                    })}
                  </Text>
                </View>
              </Card>
            ) : data.payouts.length === 0 ? (
              <EmptyState icon={Receipt} title={t('earnings.noPayouts')} />
            ) : (
              <ListGroup>
                {data.payouts.slice(0, 8).map((payout) => (
                  <ListRow
                    key={payout.id}
                    icon={Receipt}
                    title={f.money(payout.netAmount)}
                    subtitle={t('earnings.period', {
                      start: f.date(payout.periodStart, 'dayMonth'),
                      end: f.date(new Date(Date.parse(payout.periodEnd) - 1), 'dayMonth'),
                    })}
                    trailing={
                      <Badge
                        label={t(`earnings.${payout.status}`)}
                        tone={payoutTone[payout.status]}
                      />
                    }
                  />
                ))}
              </ListGroup>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  net: { marginTop: space.xs, fontSize: 34, lineHeight: 42 },
  breakdown: {
    flexDirection: 'row',
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: 1,
    gap: space.md,
  },
  breakdownItem: { flex: 1, gap: 2 },
  chartTitle: { marginBottom: space.lg },
  section: { gap: space.lg },
  vendor: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
});
