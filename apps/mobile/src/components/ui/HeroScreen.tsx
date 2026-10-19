import type { MediaKey } from '@myhome/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from '@/components/ui/icons';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Photo } from './Photo';

export interface HeroScreenProps {
  media: MediaKey;
  /** Content laid over the bottom of the photograph (title, badges). */
  overlay: ReactNode;
  children: ReactNode;
  fallbackHref: Href;
  /** Pinned bottom bar (e.g. price and primary action). */
  footer?: ReactNode;
  heroHeight?: number;
}

/**
 * Detail layout: a full-bleed photograph with a translucent back button, the
 * title over a gradient, and content on a sheet that overlaps the image.
 */
export function HeroScreen({
  media,
  overlay,
  children,
  fallbackHref,
  footer,
  heroHeight = 340,
}: HeroScreenProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallbackHref));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ height: heroHeight + insets.top }}>
          <Photo media={media} style={StyleSheet.absoluteFill} priority="high" />
          <LinearGradient
            colors={[
              'rgba(8,14,21,0.55)',
              'rgba(8,14,21,0.05)',
              'rgba(8,14,21,0.5)',
              'rgba(8,14,21,0.92)',
            ]}
            locations={[0, 0.25, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.overlay, { paddingBottom: space.xxl + radius.xxl }]}>{overlay}</View>
        </View>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>{children}</View>
      </ScrollView>
      <View style={[styles.topBar, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton
          icon={ArrowLeft}
          directional
          tone="translucent"
          label={t('common.back')}
          onPress={goBack}
        />
      </View>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.hairline,
              paddingBottom: insets.bottom + space.md,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', start: gutter, end: gutter, bottom: 0, gap: space.sm },
  sheet: {
    marginTop: -radius.xxl,
    borderTopStartRadius: radius.xxl,
    borderTopEndRadius: radius.xxl,
    paddingHorizontal: gutter,
    paddingTop: space.xxl,
    paddingBottom: space.huge,
    gap: space.xxl,
  },
  topBar: {
    position: 'absolute',
    start: gutter,
    end: gutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    paddingHorizontal: gutter,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
