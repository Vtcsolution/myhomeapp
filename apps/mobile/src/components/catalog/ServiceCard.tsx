import { type Service, startingPrice } from '@myhome/shared';
import { Star } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Photo } from '@/components/ui/Photo';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

export const SERVICE_CARD_WIDTH = 200;

/** Vertical service card for horizontal carousels. */
export function ServiceCard({
  service,
  onPress,
  caption,
}: {
  service: Service;
  onPress: () => void;
  /** Replaces the price line, e.g. "Last booked 16 Oct". */
  caption?: string;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const f = useFormat();
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={f.text(service.name)}
      padded={false}
      style={styles.card}
    >
      <Photo media={service.image} style={styles.image} />
      <View style={styles.body}>
        <Text variant="calloutStrong" numberOfLines={2} style={styles.name}>
          {f.text(service.name)}
        </Text>
        {service.reviewsCount > 0 ? (
          <View style={styles.rating}>
            <Star size={12} color={colors.accent} fill={colors.accent} strokeWidth={1.5} />
            <Text variant="captionStrong">{f.rating(service.rating)}</Text>
            <Text variant="caption" tone="muted">
              ({service.reviewsCount})
            </Text>
          </View>
        ) : null}
        <Text variant="captionStrong" tone="accent" numberOfLines={1}>
          {caption ?? t('home.fromPrice', { price: f.money(startingPrice(service)) })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: SERVICE_CARD_WIDTH },
  image: { width: '100%', height: 120 },
  body: { padding: space.md, gap: space.xs, flex: 1 },
  name: { minHeight: 40 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
