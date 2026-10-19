import { type Service, startingPrice } from '@myhome/shared';
import { Star } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Photo } from '@/components/ui/Photo';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Compact service card: photo, name, rating and "from" price. */
export function ServiceRow({
  service,
  onPress,
  eyebrow,
}: {
  service: Service;
  onPress: () => void;
  /** Small label above the name, e.g. the category in search results. */
  eyebrow?: string;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const f = useFormat();
  return (
    <Card onPress={onPress} accessibilityLabel={f.text(service.name)} padded={false}>
      <View style={styles.row}>
        <Photo media={service.image} style={styles.image} />
        <View style={styles.body}>
          {eyebrow ? (
            <Text variant="overline" tone="accent" numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="bodyStrong" numberOfLines={1}>
            {f.text(service.name)}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {f.text(service.shortDescription)}
          </Text>
          <View style={styles.meta}>
            {service.reviewsCount > 0 ? (
              <View style={styles.rating}>
                <Star size={13} color={colors.accent} fill={colors.accent} strokeWidth={1.5} />
                <Text variant="captionStrong">{f.rating(service.rating)}</Text>
                <Text variant="caption" tone="muted">
                  ({service.reviewsCount})
                </Text>
              </View>
            ) : (
              <View />
            )}
            <Text variant="captionStrong" tone="accent" numberOfLines={1}>
              {t('home.fromPrice', { price: f.money(startingPrice(service)) })}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  image: {
    width: 104,
    minHeight: 104,
    borderTopStartRadius: radius.xl,
    borderBottomStartRadius: radius.xl,
  },
  body: { flex: 1, padding: space.md, gap: space.xs, justifyContent: 'center' },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.sm,
    rowGap: 2,
    marginTop: space.xs,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
