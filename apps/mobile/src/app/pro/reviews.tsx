import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useTechnicianProfile, useTechnicianReviews } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={colors.accent}
          fill={n <= Math.round(value) ? colors.accent : 'transparent'}
          strokeWidth={1.25}
        />
      ))}
    </View>
  );
}

/** Published customer reviews of the professional's completed jobs. */
export default function ReviewsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const profile = useTechnicianProfile();
  const reviews = useTechnicianReviews();
  const p = profile.data;

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/pro/profile"
          title={t('reviews.title')}
          subtitle={t('reviews.subtitle')}
        />
      }
      refreshing={reviews.isRefetching}
      onRefresh={() => void reviews.refetch()}
    >
      {p ? (
        <Card tone="midnight">
          <Text variant="overline" style={{ color: colors.champagne }}>
            {t('reviews.average')}
          </Text>
          <View style={styles.average}>
            <Text variant="hero" style={{ color: colors.onMidnight }}>
              {p.rating ? f.rating(p.rating) : '—'}
            </Text>
            <View style={styles.flex}>
              <Stars value={p.rating} size={18} />
              <Text variant="caption" style={{ color: 'rgba(251,248,243,0.72)' }}>
                {t('reviews.count', { count: p.reviewsCount })}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {reviews.isPending ? (
        <SkeletonList count={3} height={110} />
      ) : reviews.isError ? (
        <ErrorState onRetry={() => void reviews.refetch()} />
      ) : reviews.data.length === 0 ? (
        <EmptyState icon={Star} title={t('reviews.emptyTitle')} body={t('reviews.emptyBody')} />
      ) : (
        <View style={styles.list}>
          {reviews.data.map((review) => (
            <Card key={review.id}>
              <View style={styles.head}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" natural>
                    {review.customerDisplayName}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {f.text(review.serviceName)} · {f.date(review.createdAt, 'medium')}
                  </Text>
                </View>
                <Stars value={review.rating} />
              </View>
              {review.comment ? (
                <Text variant="callout" tone="secondary" natural style={styles.comment}>
                  {review.comment}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  average: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.sm },
  list: { gap: space.md },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  comment: { marginTop: space.sm },
});
