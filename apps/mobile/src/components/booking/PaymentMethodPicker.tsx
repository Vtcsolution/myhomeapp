import { type Fils, type PaymentMethod, paymentMethodLabels } from '@myhome/shared';
import {
  Banknote,
  CreditCard,
  type LucideIcon,
  ShieldCheck,
  Smartphone,
  Wallet,
} from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import type { TKey } from '@/i18n/translate';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const METHODS: { method: PaymentMethod; icon: LucideIcon; note: TKey }[] = [
  { method: 'knet', icon: CreditCard, note: 'checkout.knetNote' },
  { method: 'card', icon: CreditCard, note: 'checkout.cardNote' },
  { method: 'apple_pay', icon: Smartphone, note: 'checkout.applePayNote' },
  { method: 'cash', icon: Banknote, note: 'checkout.cashNote' },
  { method: 'wallet', icon: Wallet, note: 'checkout.walletNote' },
];

/**
 * Payment method selection for the demo. No card details are ever collected;
 * electronic methods are simulated and labelled as such.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  total,
  walletBalance,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  total: Fils | undefined;
  walletBalance: Fils | undefined;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  return (
    <View
      style={styles.list}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('checkout.payment')}
    >
      <View style={[styles.demo, { backgroundColor: colors.infoSoft }]}>
        <ShieldCheck size={16} color={colors.info} strokeWidth={1.75} />
        <Text variant="caption" style={[styles.flex, { color: colors.info }]}>
          {t('checkout.paymentDemo')}
        </Text>
      </View>
      {METHODS.map(({ method, icon: Icon, note }) => {
        const insufficient =
          method === 'wallet' &&
          (walletBalance === undefined || (total !== undefined && walletBalance < total));
        const selected = value === method;
        const noteText =
          method === 'wallet'
            ? t(insufficient ? 'checkout.walletLow' : 'checkout.walletNote', {
                amount: f.money(walletBalance ?? 0),
              })
            : t(note);
        return (
          <PressableScale
            key={method}
            disabled={insufficient}
            scaleTo={0.99}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: insufficient }}
            accessibilityLabel={`${f.text(paymentMethodLabels[method])}. ${noteText}`}
            onPress={() => {
              hapticSelection();
              onChange(method);
            }}
            style={[
              styles.row,
              {
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? colors.accentSoft : colors.surface,
                opacity: insufficient ? 0.5 : 1,
              },
            ]}
          >
            <Icon
              size={18}
              color={selected ? colors.accent : colors.textSecondary}
              strokeWidth={1.75}
            />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{f.text(paymentMethodLabels[method])}</Text>
              <Text variant="caption" tone="muted">
                {noteText}
              </Text>
            </View>
            <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}>
              {selected ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  flex: { flex: 1, gap: 2 },
  demo: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
