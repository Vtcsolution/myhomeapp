import {
  monthName,
  toKuwaitParts,
  walletTransactionLabels,
  type WalletTransactionType,
  type WalletTransactionView,
} from '@myhome/shared';
import { router } from 'expo-router';
import {
  BadgePercent,
  CreditCard,
  type LucideIcon,
  PlusCircle,
  Undo2,
  WalletMinimal,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup } from '@/components/ui/ListRow';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useWallet } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { filterTransactions, groupByMonth, type WalletFilter } from '@/lib/wallet';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const typeIcon: Record<WalletTransactionType, LucideIcon> = {
  top_up: PlusCircle,
  payment: CreditCard,
  refund: Undo2,
  cashback: BadgePercent,
};

/** Account → Wallet: simulated balance and statement. */
export default function WalletScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const wallet = useWallet();
  const [filter, setFilter] = useState<WalletFilter>('all');
  const [selected, setSelected] = useState<WalletTransactionView | null>(null);
  const all = wallet.data?.transactions ?? [];
  const groups = groupByMonth(filterTransactions(all, filter));

  return (
    <Screen
      header={<ScreenHeader back fallbackHref="/customer/account" title={t('wallet.title')} />}
      refreshing={wallet.isRefetching}
      onRefresh={() => void wallet.refetch()}
    >
      {wallet.isPending ? (
        <>
          <Skeleton height={150} rounded={radius.xl} />
          <SkeletonList count={4} height={64} />
        </>
      ) : wallet.isError ? (
        <ErrorState onRetry={() => void wallet.refetch()} />
      ) : (
        <>
          <Card tone="midnight">
            <View style={styles.balanceHead}>
              <View style={[styles.balanceIcon, { backgroundColor: colors.champagne }]}>
                <WalletMinimal size={18} color={colors.midnight} strokeWidth={1.75} />
              </View>
              <Text variant="overline" style={[styles.flex, { color: colors.champagne }]}>
                {t('wallet.balance')}
              </Text>
              <Badge label={t('wallet.simulated')} tone="accent" />
            </View>
            <Text
              variant="hero"
              style={[styles.balance, { color: colors.onMidnight }]}
              accessibilityLabel={`${t('wallet.balance')}: ${f.money(wallet.data.balance)}`}
            >
              {f.money(wallet.data.balance)}
            </Text>
          </Card>
          <DemoNotice text={t('wallet.demoNote')} />

          <View style={styles.section}>
            <Text variant="title3" accessibilityRole="header">
              {t('wallet.activity')}
            </Text>
            <SegmentedControl<WalletFilter>
              accessibilityLabel={t('wallet.activity')}
              value={filter}
              onChange={setFilter}
              segments={[
                { value: 'all', label: t('wallet.all') },
                { value: 'credits', label: t('wallet.credits') },
                { value: 'debits', label: t('wallet.debits') },
              ]}
            />
          </View>

          {all.length === 0 ? (
            <EmptyState
              icon={WalletMinimal}
              title={t('wallet.emptyTitle')}
              body={t('wallet.emptyBody')}
            />
          ) : groups.length === 0 ? (
            <Text variant="callout" tone="muted" align="center">
              {t('wallet.emptyFiltered')}
            </Text>
          ) : (
            groups.map((group) => {
              const { year, month } = toKuwaitParts(group.sample);
              return (
                <View key={group.month} style={styles.section}>
                  <Text variant="overline" tone="muted">
                    {`${monthName(month, locale)} ${year}`}
                  </Text>
                  <ListGroup>
                    {group.transactions.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} onPress={() => setSelected(tx)} />
                    ))}
                  </ListGroup>
                </View>
              );
            })
          )}
        </>
      )}

      <TransactionSheet tx={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function TransactionRow({ tx, onPress }: { tx: WalletTransactionView; onPress: () => void }) {
  const { colors } = useTheme();
  const f = useFormat();
  const Icon = typeIcon[tx.type];
  const credit = tx.amount > 0;
  const amount = f.money(tx.amount, { showPlusSign: true });
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${f.text(tx.description)}, ${amount}, ${f.date(tx.createdAt, 'medium')}`}
      style={styles.row}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: credit ? colors.successSoft : colors.surfaceMuted },
        ]}
      >
        <Icon size={18} color={credit ? colors.success : colors.textSecondary} strokeWidth={1.75} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {f.text(walletTransactionLabels[tx.type])}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {f.text(tx.description)}
        </Text>
        <Text variant="caption" tone="muted">
          {f.date(tx.createdAt, 'dayMonth')} · {tx.reference}
        </Text>
      </View>
      <Text
        variant="calloutStrong"
        style={[styles.amount, { color: credit ? colors.success : colors.textPrimary }]}
      >
        {amount}
      </Text>
    </PressableScale>
  );
}

function TransactionSheet({
  tx,
  onClose,
}: {
  tx: WalletTransactionView | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const rows: [string, string][] = tx
    ? [
        [t('wallet.type'), f.text(walletTransactionLabels[tx.type])],
        [t('wallet.amount'), f.money(tx.amount, { showPlusSign: true })],
        [t('wallet.date'), `${f.date(tx.createdAt, 'full')} · ${f.time(tx.createdAt)}`],
        [t('wallet.reference'), tx.reference],
        ...(tx.bookingReference
          ? ([[t('wallet.booking'), tx.bookingReference]] as [string, string][])
          : []),
        [t('wallet.status'), t('wallet.completed')],
      ]
    : [];
  return (
    <Sheet
      visible={tx !== null}
      title={t('wallet.details')}
      onClose={onClose}
      footer={
        tx?.bookingId ? (
          <Button
            label={t('wallet.viewBooking')}
            variant="secondary"
            fullWidth
            onPress={() => {
              onClose();
              router.push(customerRoutes.booking(tx.bookingId!));
            }}
          />
        ) : undefined
      }
    >
      {tx ? (
        <View style={styles.sheetBody}>
          <Text variant="callout" tone="secondary">
            {f.text(tx.description)}
          </Text>
          {rows.map(([label, value]) => (
            <View key={label} style={[styles.detail, { borderTopColor: colors.hairline }]}>
              <Text variant="callout" tone="secondary" style={styles.flex}>
                {label}
              </Text>
              <Text variant="calloutStrong" style={styles.detailValue}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  balanceHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  balanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { marginTop: space.lg },
  section: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { flexShrink: 0 },
  sheetBody: { gap: space.sm },
  detail: {
    flexDirection: 'row',
    gap: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  detailValue: { flexShrink: 1 },
});
