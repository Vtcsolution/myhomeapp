import type { ReviewView } from '@myhome/shared';
import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { ltrIsolate } from '@/lib/bidi';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stars} accessibilityElementsHidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={colors.accent}
          fill={n <= Math.round(rating) ? colors.accent : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

/** Rating summary followed by recent written reviews. */
export function ReviewList({
  rating,
  count,
  reviews,
}: {
  rating: number;
  count: number;
  reviews: ReviewView[];
}) {
  const f = useFormat();
  const { t } = useLocale();
  return (
    <View style={styles.wrapper}>
      <View
        style={styles.summary}
        accessible
        accessibilityLabel={`${f.rating(rating)} / 5, ${t('home.reviews', { count })}`}
      >
        <Text variant="numeral">{f.rating(rating)}</Text>
        <View style={styles.summaryText}>
          <Stars rating={rating} size={16} />
          <Text variant="caption" tone="muted">
            {t('home.reviews', { count })}
          </Text>
        </View>
      </View>
      {reviews.map((review) => (
        <Card key={review.id}>
          <View style={styles.header}>
            <Avatar name={review.customerDisplayName} size={36} />
            <View style={styles.headerText}>
              <Text variant="calloutStrong">{ltrIsolate(review.customerDisplayName)}</Text>
              <Text variant="caption" tone="muted">
                {f.date(review.createdAt, 'medium')}
              </Text>
            </View>
            <Stars rating={review.rating} size={12} />
          </View>
          <Text
            variant="callout"
            tone="secondary"
            style={[styles.comment, { writingDirection: review.language === 'ar' ? 'rtl' : 'ltr' }]}
          >
            {review.comment}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  summaryText: { gap: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1 },
  comment: { marginTop: space.md },
});
