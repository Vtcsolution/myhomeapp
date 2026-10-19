import type { BookingView } from '@myhome/shared';
import { ArrowRight, Navigation } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Text } from '@/components/ui/Text';
import { useLiveTracking } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Midnight banner for a booking that is under way, with a calm live pulse. */
export function LiveBookingCard({
  booking,
  onPress,
}: {
  booking: BookingView;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const f = useFormat();
  const tracking = useLiveTracking(booking.status === 'on_the_way' ? booking.id : undefined);
  const name = booking.technician ? (f.text(booking.technician.fullName).split(' ')[0] ?? '') : '';

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 1.4 }],
  }));

  const title =
    booking.status === 'on_the_way'
      ? t('home.liveOnTheWay', { name })
      : booking.status === 'arrived'
        ? t('home.liveArrived', { name })
        : t('home.liveInProgress');
  const eta = tracking.data?.etaMinutes;
  const subtitle =
    booking.status === 'on_the_way'
      ? eta && eta > 1
        ? t('home.liveEta', { count: eta })
        : t('home.liveSoon')
      : f.text(booking.service.name);

  return (
    <Card tone="midnight" onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={styles.row}>
        <View style={styles.indicator}>
          <Animated.View style={[styles.ring, { backgroundColor: colors.champagne }, ring]} />
          <View style={[styles.core, { backgroundColor: colors.champagne }]}>
            <Navigation size={16} color={colors.midnight} strokeWidth={2} />
          </View>
        </View>
        <View style={styles.texts}>
          <Text variant="bodyStrong" style={{ color: colors.onMidnight }} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" style={{ color: 'rgba(251,248,243,0.72)' }} numberOfLines={1}>
            {subtitle} · {booking.reference}
          </Text>
        </View>
        <DirectionalIcon icon={ArrowRight} size={18} color={colors.champagne} strokeWidth={1.75} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  indicator: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: radius.pill },
  core: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
