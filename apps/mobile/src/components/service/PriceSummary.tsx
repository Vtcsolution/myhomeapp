import { businessConfig, type PriceBreakdown } from '@myhome/shared';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { priceRows } from '@/lib/priceRows';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'success';
}) {
  return (
    <View style={styles.row}>
      <Text
        variant={strong ? 'bodyStrong' : 'callout'}
        tone={strong ? 'primary' : 'secondary'}
        style={styles.label}
      >
        {label}
      </Text>
      <Text variant={strong ? 'title3' : 'calloutStrong'} tone={tone ?? 'primary'}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Line-by-line price produced by the shared pricing engine. Nothing here does
 * arithmetic: every figure comes from the `PriceBreakdown` (see `priceRows`).
 */
export function PriceSummary({ price, title }: { price: PriceBreakdown; title?: string }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const rows = priceRows(price);
  return (
    <Card>
      <Text variant="captionStrong" tone="secondary" style={styles.title}>
        {title ?? t('service.priceSummary')}
      </Text>
      <View style={styles.rows}>
        {rows.map((row) => {
          switch (row.kind) {
            case 'item':
              return (
                <Row
                  key={row.key}
                  label={`${f.text(row.label)}${row.quantity > 1 ? ` × ${row.quantity}` : ''}`}
                  value={f.money(row.amount)}
                />
              );
            case 'subtotal':
              return (
                <View key={row.key} style={styles.group}>
                  <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
                  <Row label={t('service.subtotal')} value={f.money(row.amount)} />
                </View>
              );
            case 'visitFee':
              return (
                <Row
                  key={row.key}
                  label={t('service.visitFee')}
                  value={row.waived ? t('service.visitFeeWaived') : f.money(row.amount)}
                  {...(row.waived ? { tone: 'success' as const } : {})}
                />
              );
            case 'discount':
              return (
                <Row
                  key={row.key}
                  label={row.code ?? t('checkout.coupon')}
                  value={f.money(row.amount)}
                  tone="success"
                />
              );
            case 'tax':
              return <Row key={row.key} label={t('service.tax')} value={f.money(row.amount)} />;
            case 'total':
              return (
                <View key={row.key} style={styles.group}>
                  <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
                  <Row label={t('service.total')} value={f.money(row.amount)} strong />
                </View>
              );
          }
        })}
      </View>
      {price.visitFee ? (
        <Text variant="caption" tone="muted" style={styles.note}>
          {t('service.visitFeeNote', {
            fee: f.money(businessConfig.visitFee),
            threshold: f.money(businessConfig.freeVisitThreshold),
          })}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: space.md },
  rows: { gap: space.sm },
  group: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  label: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: space.xs },
  note: { marginTop: space.md },
});
