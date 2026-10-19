import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { ArrowRight, Globe } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { heroImages } from '@/media/images';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';

export default function WelcomeScreen() {
  const { t, locale, setLocale } = useLocale();
  const { colors } = useTheme();
  const { session } = useSession();

  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [reveal]);
  const copyStyle = useAnimatedStyle(() => ({
    opacity: reveal.get(),
    transform: [{ translateY: (1 - reveal.get()) * 18 }],
  }));

  if (session) return <Redirect href="/" />;

  return (
    <View style={[styles.root, { backgroundColor: colors.midnight }]}>
      <Photo source={heroImages.welcome} style={StyleSheet.absoluteFill} transition={400} />
      <LinearGradient
        colors={[
          'rgba(8,14,21,0.55)',
          'rgba(8,14,21,0.05)',
          'rgba(8,14,21,0.72)',
          'rgba(8,14,21,0.96)',
        ]}
        locations={[0, 0.28, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Wordmark />
          <PressableScale
            haptic
            onPress={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            accessibilityLabel={locale === 'en' ? 'العربية' : 'English'}
            style={styles.language}
          >
            <Globe size={16} color={colors.onMidnight} strokeWidth={1.75} />
            <Text variant="captionStrong" style={{ color: colors.onMidnight }}>
              {locale === 'en' ? 'العربية' : 'English'}
            </Text>
          </PressableScale>
        </View>

        <Animated.View style={[styles.copy, copyStyle]}>
          <Text variant="overline" style={{ color: colors.champagne }}>
            {t('welcome.eyebrow')}
          </Text>
          <Text variant="hero" style={{ color: colors.onMidnight }} accessibilityRole="header">
            {t('welcome.title')}
          </Text>
          <Text variant="body" style={{ color: 'rgba(251,248,243,0.8)' }}>
            {t('welcome.subtitle')}
          </Text>
          <View style={styles.actions}>
            <Button
              label={t('welcome.getStarted')}
              variant="accent"
              fullWidth
              onPress={() => router.push({ pathname: '/sign-in', params: { role: 'customer' } })}
            />
            <Button
              label={t('welcome.professional')}
              variant="inverse"
              fullWidth
              trailingIcon={ArrowRight}
              onPress={() => router.push({ pathname: '/sign-in', params: { role: 'technician' } })}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: gutter, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
  },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  copy: {
    gap: space.md,
    paddingBottom: space.xl,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  actions: { gap: space.md, marginTop: space.lg },
});
