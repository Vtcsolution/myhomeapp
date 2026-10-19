import {
  addressTitle,
  type ApiErrorCode,
  type BookingView,
  businessConfig,
  type CreateBookingRequest,
  isApiError,
  type PaymentMethod,
} from '@myhome/shared';
import { router } from 'expo-router';
import {
  CalendarCheck,
  CalendarClock,
  CircleAlert,
  MapPin,
  ShieldCheck,
} from '@/components/ui/icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { CouponField } from '@/components/booking/CouponField';
import { FlowHeader } from '@/components/booking/FlowHeader';
import { FlowMissing } from '@/components/booking/FlowMissing';
import { PaymentMethodPicker } from '@/components/booking/PaymentMethodPicker';
import { InfoRow, ServiceSummary, SummaryCard } from '@/components/booking/Summary';
import { PriceSummary } from '@/components/service/PriceSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useBooking, useCreateBooking, useQuote, useWallet } from '@/data/queries';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { useFormat } from '@/hooks/useFormat';
import type { TKey } from '@/i18n/translate';
import { bookingFlowRoutes } from '@/lib/bookingFlow';
import { flowSignature, isResumable } from '@/lib/checkoutAttempts';
import { createOnceGuard } from '@/lib/onceGuard';
import { useLeaveFlow } from '@/navigation/useLeaveFlow';
import { useLocale } from '@/providers/LocaleProvider';
import { persistDemoStateNow } from '@/services/api';
import { loadAttempt, rememberBooking, startNewAttempt } from '@/services/checkoutAttempts';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const ERROR_MESSAGE: Partial<Record<ApiErrorCode, TKey>> = {
  SLOT_UNAVAILABLE: 'checkout.errorSlot',
  COUPON_INVALID: 'checkout.errorCoupon',
  INSUFFICIENT_FUNDS: 'checkout.errorFunds',
};

/**
 * Booking step 3 — review everything, apply a promo code, choose how to pay
 * (simulated) and confirm. Prices come only from the API quote.
 */
export default function BookCheckoutScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { flow, service, selections, address, isPending, isError, refetch } = useBookingFlow();
  const [couponCode, setCouponCode] = useState<string | undefined>();
  const quote = useQuote(service.data?.id, selections, couponCode);
  const wallet = useWallet();
  const create = useCreateBooking();
  const leaveFlow = useLeaveFlow();
  const [method, setMethod] = useState<PaymentMethod>('knet');
  const [notes, setNotes] = useState('');
  const [failure, setFailure] = useState<ApiErrorCode | 'UNKNOWN' | null>(null);
  const [placed, setPlaced] = useState(false);
  // One idempotency key per checkout flow, remembered on the device: a retry
  // (even after a web reload) returns the original booking instead of a new one.
  const signature = flow ? flowSignature(flow) : '';
  const [attempt] = useState(() => (signature ? loadAttempt(signature) : null));
  const previous = useBooking(attempt?.bookingId);
  const alreadyBooked = isResumable(previous.data?.status) ? previous.data : undefined;
  // Ignores repeated taps while a request is in flight.
  const [once] = useState(() => createOnceGuard((task: () => Promise<BookingView>) => task()));

  if (!flow || !flow.addressId || !flow.slot) return <FlowMissing />;

  const coupon = quote.data?.coupon;
  const appliedCode = coupon?.status === 'applied' ? coupon.code : undefined;
  const price = quote.data?.price;
  const slotStart = flow.slot;
  const slotEnd = new Date(
    Date.parse(slotStart) + businessConfig.slotLengthMinutes * 60_000,
  ).toISOString();
  const walletLow =
    method === 'wallet' && price && wallet.data ? wallet.data.balance < price.total : false;
  const ready = !!price && !!address && !!selections && !quote.isPlaceholderData && !walletLow;

  const confirm = () => {
    // Repeated taps while a request runs (or after success) are ignored.
    if (!ready || !selections || placed || once.isRunning() || alreadyBooked) return;
    // The earlier booking from this flow was cancelled (or reset): book afresh.
    const key = attempt?.bookingId ? startNewAttempt(signature).key : attempt?.key;
    const request: CreateBookingRequest = {
      serviceId: flow.serviceId,
      selections,
      addressId: flow.addressId!,
      slotStart,
      paymentMethod: method,
      ...(key ? { idempotencyKey: key } : {}),
      ...(appliedCode ? { couponCode: appliedCode } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    setFailure(null);
    once(() => create.mutateAsync(request)).then(
      (booking) => {
        setPlaced(true);
        rememberBooking(signature, booking.id);
        persistDemoStateNow();
        // Leave the flow so Back can never return to a submitted checkout.
        leaveFlow(bookingFlowRoutes.confirmed(booking.id));
      },
      (error: unknown) => {
        const code = isApiError(error) ? error.code : 'UNKNOWN';
        setFailure(code);
        if (code === 'COUPON_INVALID') setCouponCode(undefined);
        if (code === 'INSUFFICIENT_FUNDS') void wallet.refetch();
      },
    );
  };

  const viewConfirmation = () =>
    alreadyBooked && leaveFlow(bookingFlowRoutes.confirmed(alreadyBooked.id));
  const changeTime = () =>
    router.canGoBack()
      ? router.back()
      : router.replace(bookingFlowRoutes.schedule({ ...flow, addressId: flow.addressId! }));
  const changeAddress = () => router.dismissTo(bookingFlowRoutes.address(flow));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={
          <FlowHeader
            step={3}
            title={t('checkout.title')}
            fallbackHref={bookingFlowRoutes.schedule({ ...flow, addressId: flow.addressId })}
          />
        }
        footer={
          alreadyBooked ? (
            <Button
              label={t('checkout.viewConfirmation')}
              icon={CalendarCheck}
              fullWidth
              onPress={viewConfirmation}
            />
          ) : (
            <Button
              label={
                price
                  ? t('checkout.confirm', { amount: f.money(price.total) })
                  : t('common.confirm')
              }
              icon={ShieldCheck}
              fullWidth
              disabled={!ready}
              loading={create.isPending || placed}
              onPress={confirm}
            />
          )
        }
      >
        {alreadyBooked ? (
          <View
            style={[styles.failure, { backgroundColor: colors.successSoft }]}
            accessibilityRole="alert"
          >
            <CalendarCheck size={18} color={colors.success} strokeWidth={1.75} />
            <View style={styles.failureText}>
              <Text variant="bodyStrong" style={{ color: colors.successText }}>
                {t('checkout.alreadyBookedTitle')}
              </Text>
              <Text variant="callout" tone="secondary">
                {t('checkout.alreadyBookedBody', { reference: alreadyBooked.reference })}
              </Text>
            </View>
          </View>
        ) : null}

        {isPending ? (
          <Skeleton height={220} rounded={radius.xl} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : service.data && selections ? (
          <SummaryCard>
            <ServiceSummary service={service.data} selections={selections} />
            {address ? (
              <InfoRow
                icon={MapPin}
                label={addressTitle(address, locale)}
                value={f.address(address, 'short')}
                onChange={changeAddress}
              />
            ) : null}
            <InfoRow
              icon={CalendarClock}
              label={t('checkout.when')}
              value={f.date(slotStart, 'full')}
              detail={f.timeRange(slotStart, slotEnd)}
              onChange={changeTime}
            />
          </SummaryCard>
        ) : null}

        {failure ? (
          <View
            style={[styles.failure, { backgroundColor: colors.dangerSoft }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <CircleAlert size={18} color={colors.danger} strokeWidth={1.75} />
            <View style={styles.failureText}>
              <Text variant="callout" tone="danger">
                {t(ERROR_MESSAGE[failure as ApiErrorCode] ?? 'checkout.errorGeneric')}
              </Text>
              {failure === 'SLOT_UNAVAILABLE' ? (
                <Button
                  label={t('checkout.chooseAnother')}
                  size="sm"
                  variant="secondary"
                  onPress={changeTime}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <Section title={t('checkout.coupon')}>
          <CouponField
            applied={appliedCode}
            result={coupon}
            checking={!!couponCode && quote.isFetching}
            onApply={(code) => setCouponCode(code)}
            onRemove={() => setCouponCode(undefined)}
          />
        </Section>

        {price ? (
          <View style={{ opacity: quote.isPlaceholderData ? 0.6 : 1 }}>
            <PriceSummary price={price} />
          </View>
        ) : quote.isError ? (
          <ErrorState onRetry={() => void quote.refetch()} />
        ) : (
          <Skeleton height={220} rounded={radius.xl} />
        )}

        <Section title={t('checkout.payment')}>
          <PaymentMethodPicker
            value={method}
            onChange={(m) => {
              setMethod(m);
              if (failure === 'INSUFFICIENT_FUNDS') setFailure(null);
            }}
            total={price?.total}
            walletBalance={wallet.data?.balance}
          />
        </Section>

        <TextField
          label={t('checkout.notes')}
          placeholder={t('checkout.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          maxLength={500}
          multiline
        />

        <Card tone="muted">
          <Text variant="captionStrong" tone="secondary" style={styles.termsTitle}>
            {t('checkout.terms')}
          </Text>
          <View style={styles.terms}>
            <Term
              text={t('checkout.freeCancel', { hours: businessConfig.freeCancellationHours })}
            />
            <Term
              text={t('checkout.lateFee', { fee: f.money(businessConfig.lateCancellationFee) })}
            />
            {service.data?.pricingModel === 'inspection' ? (
              <Term text={t('checkout.inspectionTerm')} />
            ) : null}
          </View>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Term({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.term}>
      <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
      <Text variant="caption" tone="secondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.md },
  failure: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  failureText: { flex: 1, gap: space.sm, alignItems: 'flex-start' },
  termsTitle: { marginBottom: space.sm },
  terms: { gap: space.sm },
  term: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
});
