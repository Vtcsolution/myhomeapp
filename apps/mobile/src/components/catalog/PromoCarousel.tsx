import type { Promotion } from '@myhome/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Photo } from '@/components/ui/Photo';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';

const GAP = space.md;

/** Paged, full-bleed editorial offer cards with a quiet page indicator. */
export function PromoCarousel({
  promotions,
  onPress,
}: {
  promotions: Promotion[];
  onPress: (promotion: Promotion) => void;
}) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { t } = useLocale();
  const f = useFormat();
  const [index, setIndex] = useState(0);
  const cardWidth = Math.min(width, 560) - gutter * 2;

  return (
    <View style={styles.wrapper}>
      <FlatList
        horizontal
        data={promotions}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: gutter, gap: GAP }}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(Math.abs(e.nativeEvent.contentOffset.x) / (cardWidth + GAP)))
        }
        renderItem={({ item }) => (
          <PressableScale
            onPress={() => onPress(item)}
            accessibilityLabel={`${f.text(item.title)}. ${f.text(item.subtitle)}`}
            style={[styles.card, { width: cardWidth }]}
          >
            <Photo media={item.image} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(8,14,21,0.05)', 'rgba(8,14,21,0.35)', 'rgba(8,14,21,0.88)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.copy}>
              {item.couponCode ? (
                <View style={[styles.code, { borderColor: colors.champagne }]}>
                  <Text variant="captionStrong" style={{ color: colors.champagne }}>
                    {t('home.useCode', { code: item.couponCode })}
                  </Text>
                </View>
              ) : null}
              <Text variant="title1" style={{ color: colors.onMidnight }} numberOfLines={2}>
                {f.text(item.title)}
              </Text>
              <Text variant="callout" style={{ color: 'rgba(251,248,243,0.82)' }} numberOfLines={2}>
                {f.text(item.subtitle)}
              </Text>
            </View>
          </PressableScale>
        )}
      />
      {promotions.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden>
          {promotions.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.accent : colors.border,
                  width: i === index ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: -gutter, gap: space.md },
  card: { height: 208, borderRadius: radius.xxl, overflow: 'hidden', justifyContent: 'flex-end' },
  copy: { padding: space.xl, gap: space.xs },
  code: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    marginBottom: space.xs,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
});
