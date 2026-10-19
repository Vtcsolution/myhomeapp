import { addressTitle, paymentMethodLabels } from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, Check, CreditCard, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { InfoRow, ServiceSummary, SummaryCard } from '@/components/booking/Summary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBooking, useService } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { createTapGuard } from '@/lib/tapGuard';
import { customerRoutes } from '@/navigation/routes';
import { useLeaveFlow } from '@/navigation/useLeaveFlow';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Booking step 4 — the booking has been created by the API. */
export default function BookingConfirmedScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const booking = useBooking(bookingId);
  const service = useService(booking.data?.serviceId);
  const leaveFlow = useLeaveFlow();

  const scale = useSharedValue(0.4);
  const fade = useSharedValue(0);
  useEffect(() => {
    scale.set(withSpring(1, { damping: 14, stiffness: 160 }));
    fade.set(withDelay(120, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
  }, [scale, fade]);
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: fade.get(),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: (1 - fade.get()) * 12 }],
  }));

  // A fast double tap on "Confirm booking" must not land on these buttons.
  const [canTap] = useState(() => createTapGuard(Date.now()));
  const goHome = () => canTap(Date.now()) && router.dismissTo('/customer');
  const viewBooking = () =>
    canTap(Date.now()) && bookingId && leaveFlow(customerRoutes.booking(bookingId));

  const b = booking.data;
  const paymentText = b
    ? b.payment.status === 'paid'
      ? `${f.text(paymentMethodLabels[b.payment.method])} · ${t('confirmed.paidSimulated')}`
      : t('confirmed.payCash', { amount: f.money(b.price.total) })
    : '';

  return (
    <Screen
      edges={['top']}
      footer={
        <View style={styles.footer}>
          <Button
            label={t('confirmed.viewBooking')}
            fullWidth
            disabled={!b}
            onPress={viewBooking}
          />
          <Button label={t('confirmed.backHome')} variant="ghost" size="md" onPress={goHome} />
        </View>
      }
      contentStyle={styles.content}
    >
      <View style={styles.hero}>
        <Animated.View style={[styles.badge, { backgroundColor: colors.accent }, badgeStyle]}>
          <Check size={36} color={colors.onAccent} strokeWidth={2.25} />
        </Animated.View>
        <Animated.View style={[styles.heroText, contentStyle]}>
          <Text variant="display" align="center" accessibilityRole="header">
            {t('confirmed.title')}
          </Text>
          <Text variant="callout" tone="secondary" align="center">
            {t('confirmed.subtitle')}
          </Text>
        </Animated.View>
      </View>

      {booking.isPending ? (
        <>
          <Skeleton height={84} rounded={radius.xl} />
          <SkeletonList count={1} height={220} />
        </>
      ) : booking.isError || !b ? (
        <ErrorState onRetry={() => void booking.refetch()} />
      ) : (
        <Animated.View style={[styles.details, contentStyle]}>
          <Card tone="midnight">
            <Text variant="overline" style={{ color: colors.champagne }} align="center">
              {t('confirmed.reference')}
            </Text>
            <Text
              variant="title1"
              align="center"
              style={[styles.reference, { color: colors.onMidnight }]}
              selectable
            >
              {b.reference}
            </Text>
          </Card>
          <SummaryCard>
            {service.data ? (
              <ServiceSummary service={service.data} selections={b.selections} />
            ) : (
              <Text variant="bodyStrong">{f.text(b.service.name)}</Text>
            )}
            <InfoRow
              icon={MapPin}
              label={addressTitle(b.address, locale)}
              value={f.address(b.address, 'short')}
            />
            <InfoRow
              icon={CalendarClock}
              label={t('checkout.when')}
              value={f.date(b.scheduledStart, 'full')}
              detail={f.timeRange(b.scheduledStart, b.scheduledEnd)}
            />
            <InfoRow
              icon={CreditCard}
              label={t('booking.payment')}
              value={f.money(b.price.total)}
              detail={paymentText}
            />
          </SummaryCard>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.xxl },
  hero: { alignItems: 'center', gap: space.lg, paddingBottom: space.md },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { gap: space.sm, alignItems: 'center' },
  details: { gap: space.lg },
  reference: { marginTop: space.xs, letterSpacing: 1, writingDirection: 'ltr' },
  footer: { gap: space.xs, alignItems: 'center' },
});
