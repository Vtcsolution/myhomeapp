import type { Coupon } from '@myhome/shared';
import * as Clipboard from 'expo-clipboard';
import { Copy, TicketPercent } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Promo code card with a ticket-style perforation and copy action. */
export function OfferCard({ coupon }: { coupon: Coupon }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { show } = useToast();
  const f = useFormat();

  const copy = async () => {
    await Clipboard.setStringAsync(coupon.code);
    hapticSelection();
    show(t('common.copied', { code: coupon.code }), 'success');
  };

  return (
    <Card padded={false}>
      <View style={styles.row}>
        <View style={[styles.stub, { backgroundColor: colors.accentSoft }]}>
          <TicketPercent size={24} color={colors.accent} strokeWidth={1.5} />
        </View>
        <View style={[styles.perforation, { borderColor: colors.border }]} />
        <View style={styles.body}>
          <Text variant="bodyStrong">{f.text(coupon.description)}</Text>
          <Text variant="caption" tone="muted">
            {t('offers.validUntil', { date: f.date(coupon.validUntil, 'medium') })}
            {coupon.minSubtotal > 0
              ? ` · ${t('offers.minSpend', { amount: f.money(coupon.minSubtotal) })}`
              : ''}
          </Text>
          {coupon.firstBookingOnly ? (
            <Text variant="caption" tone="accent">
              {t('offers.firstBooking')}
            </Text>
          ) : null}
          <View style={styles.codeRow}>
            <View style={[styles.code, { borderColor: colors.accent }]}>
              <Text variant="calloutStrong" tone="accent" style={styles.codeText}>
                {coupon.code}
              </Text>
            </View>
            <PressableScale
              onPress={copy}
              accessibilityLabel={`${t('offers.copy')} ${coupon.code}`}
              hitSlop={8}
              style={styles.copy}
            >
              <Copy size={16} color={colors.textPrimary} strokeWidth={1.75} />
              <Text variant="captionStrong">{t('offers.copy')}</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  stub: { width: 64, alignItems: 'center', justifyContent: 'center' },
  perforation: { width: 0, borderStartWidth: 1.5, borderStyle: 'dashed' },
  body: { flex: 1, padding: space.lg, gap: space.xs },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  code: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  codeText: { letterSpacing: 1.2, writingDirection: 'ltr' },
  copy: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xs },
});
