import type { CouponResult } from '@myhome/shared';
import { CircleAlert, CircleCheck, TicketPercent, X } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { couponFeedbackKey, normalizeCouponCode } from '@/lib/coupon';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { dirAttribute, directionStyle, noFocusRing, webInputMinFont } from '@/theme/direction';
import { radius, space } from '@/theme/tokens';
import { typeStyle } from '@/theme/typography';

/**
 * Promo code entry. Validation happens in the API (`getQuote`); this field
 * only submits the code and explains the verdict.
 */
export function CouponField({
  applied,
  result,
  checking,
  onApply,
  onRemove,
}: {
  /** Code currently applied to the quote (if any). */
  applied: string | undefined;
  /** The API's verdict for the last submitted code. */
  result: CouponResult | undefined;
  checking: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const [draft, setDraft] = useState('');
  const accepted = result?.status === 'applied' && applied === result.code;

  if (accepted) {
    return (
      <View
        style={[
          styles.applied,
          { backgroundColor: colors.successSoft, borderColor: colors.success },
        ]}
      >
        <CircleCheck size={18} color={colors.success} strokeWidth={1.75} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" style={{ color: colors.successText, writingDirection: 'ltr' }}>
            {result.code}
          </Text>
          <Text variant="caption" tone="secondary">
            {t('checkout.couponApplied', { amount: f.money(result.discount) })}
          </Text>
        </View>
        <PressableScale
          onPress={onRemove}
          accessibilityLabel={t('checkout.remove')}
          hitSlop={8}
          style={styles.remove}
        >
          <X size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text variant="captionStrong" tone="secondary">
            {t('checkout.remove')}
          </Text>
        </PressableScale>
      </View>
    );
  }

  const code = normalizeCouponCode(draft);
  const rejected = result?.status === 'rejected' && result.code === code;
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View
          {...dirAttribute('ltr')}
          style={[
            styles.field,
            directionStyle('ltr'),
            {
              borderColor: rejected ? colors.danger : colors.border,
              backgroundColor: colors.inputBackground,
            },
          ]}
        >
          <TicketPercent size={18} color={colors.textMuted} strokeWidth={1.75} />
          <TextInput
            value={draft}
            onChangeText={(v) => setDraft(v.toUpperCase())}
            placeholder={t('checkout.couponPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={() => code && onApply(code)}
            accessibilityLabel={t('checkout.coupon')}
            style={[
              styles.input,
              noFocusRing,
              typeStyle('bodyStrong', 'en'),
              { color: colors.textPrimary },
              webInputMinFont,
            ]}
          />
        </View>
        <Button
          label={t('checkout.apply')}
          size="md"
          variant="secondary"
          loading={checking}
          disabled={!code}
          onPress={() => onApply(code)}
        />
      </View>
      {rejected ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <CircleAlert size={14} color={colors.danger} strokeWidth={1.75} />
          <Text variant="caption" tone="danger" style={styles.flex}>
            {t(couponFeedbackKey(result))}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  input: { flex: 1, minWidth: 0, letterSpacing: 1, height: '100%' },
  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedback: { flexDirection: 'row', gap: space.xs, alignItems: 'center' },
});
