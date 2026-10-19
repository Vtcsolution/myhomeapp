import { type BookingView, businessConfig } from '@myhome/shared';
import { CircleAlert } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import type { TKey } from '@/i18n/translate';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const REASONS: TKey[] = [
  'booking.reasonPlans',
  'booking.reasonTime',
  'booking.reasonSolved',
  'booking.reasonMistake',
];

/**
 * Cancellation confirmation. The fee comes from the API (`cancellationFee`),
 * so the customer sees exactly what the shared policy will apply.
 */
export function CancelSheet({
  booking,
  visible,
  loading,
  onClose,
  onConfirm,
}: {
  booking: BookingView;
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const [reason, setReason] = useState<TKey>(REASONS[0]!);
  const fee = booking.cancellationFee;
  const refund = Math.max(0, booking.payment.paidAmount - fee);
  const refundText =
    booking.payment.paidAmount === 0
      ? t('booking.noCharge')
      : booking.payment.method === 'wallet'
        ? t('booking.refundWallet', { amount: f.money(refund) })
        : t('booking.refundOriginal', { amount: f.money(refund) });

  return (
    <Sheet
      visible={visible}
      title={t('booking.cancelTitle')}
      onClose={onClose}
      footer={
        <>
          <Button
            label={t('booking.confirmCancel')}
            fullWidth
            loading={loading}
            onPress={() => onConfirm(t(reason))}
            style={{ backgroundColor: colors.danger }}
          />
          <Button label={t('booking.keep')} variant="ghost" fullWidth onPress={onClose} />
        </>
      }
    >
      <View style={styles.body}>
        <View
          style={[
            styles.policy,
            { backgroundColor: fee ? colors.warningSoft : colors.successSoft },
          ]}
        >
          <CircleAlert size={18} color={fee ? colors.warning : colors.success} strokeWidth={1.75} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">
              {fee
                ? t('booking.cancelFee', {
                    fee: f.money(fee),
                    hours: businessConfig.freeCancellationHours,
                  })
                : t('booking.cancelFree')}
            </Text>
            <Text variant="callout" tone="secondary">
              {refundText}
            </Text>
          </View>
        </View>
        <Text variant="captionStrong" tone="secondary">
          {t('booking.reason')}
        </Text>
        <View style={styles.reasons}>
          {REASONS.map((key) => (
            <Chip
              key={key}
              label={t(key)}
              selected={reason === key}
              onPress={() => setReason(key)}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  flex: { flex: 1, gap: 2 },
  policy: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
