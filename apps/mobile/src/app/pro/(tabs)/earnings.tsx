import type { EarningsRange, PayoutStatus, StatusTone } from '@myhome/shared';
import { router } from 'expo-router';
import { Building2, CircleCheck, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EarningsBars } from '@/components/pro/EarningsBars';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader, SectionHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useEarnings, useTechnicianProfile } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const payoutTone: Record<PayoutStatus, StatusTone> = {
  scheduled: 'neutral',
  processing: 'warning',
  paid: 'success',
};

/** Earnings (simulated): period summary, daily chart, completed jobs and payouts. */
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
          { value: 'today', label: t('earnings.today') },
          { value: 'week', label: t('earnings.week') },
          { value: 'month', label: t('earnings.month') },
          { value: 'quarter', label: t('earnings.quarter') },
        ]}
      />
      <DemoNotice text={t('earnings.demoNote')} />

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

          {range !== 'today' ? (
            <Card>
              <Text variant="captionStrong" tone="secondary">
                {t('earnings.daily')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.chartHint}>
                {t('earnings.tapBar')}
              </Text>
              <EarningsBars key={range} series={data.series} />
            </Card>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title={t('earnings.completedJobs')} />
            {data.entries.length === 0 ? (
              <EmptyState icon={CircleCheck} title={t('earnings.noJobs')} />
            ) : (
              <ListGroup>
                {data.entries.slice(0, 20).map((entry) => (
                  <ListRow
                    key={entry.bookingId}
                    icon={CircleCheck}
                    title={f.text(entry.serviceName)}
                    subtitle={`${entry.reference} · ${f.date(entry.completedAt, 'dayMonth')} · ${t('earnings.feeAmount', { amount: f.money(entry.commission) })}`}
                    trailing={
                      <Text variant="calloutStrong" style={{ color: colors.success }}>
                        {f.money(entry.net)}
                      </Text>
                    }
                    onPress={() => router.push(proRoutes.job(entry.bookingId))}
                  />
                ))}
              </ListGroup>
            )}
          </View>

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
              <>
                <Text variant="caption" tone="muted">
                  {t('earnings.payoutSimulated')}
                </Text>
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
              </>
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
  chartHint: { marginTop: 2, marginBottom: space.md },
  section: { gap: space.md },
  vendor: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
});
