import {
  bookingStatusLabels,
  bookingStatusTone,
  getArea,
  isLiveStatus,
  type JobView,
} from '@myhome/shared';
import { Clock, MapPin } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { categoryIcons } from '@/components/catalog/categoryIcons';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export interface JobCardProps {
  job: JobView;
  onPress: () => void;
  /** Highlight as the next/current job. */
  featured?: boolean;
}

/** A professional's view of a booking: when, where, what and what it pays them. */
export function JobCard({ job, onPress, featured }: JobCardProps) {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const f = useFormat();
  const Icon = categoryIcons[job.category.icon];
  const area = getArea(job.address.areaId);
  const ink = featured ? colors.onMidnight : colors.textPrimary;
  const soft = featured ? 'rgba(251,248,243,0.72)' : colors.textSecondary;

  return (
    <Card
      tone={featured ? 'midnight' : 'surface'}
      onPress={onPress}
      accessibilityLabel={`${f.text(job.service.name)}, ${job.reference}`}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.icon,
            { backgroundColor: featured ? 'rgba(217,188,138,0.16)' : colors.accentSoft },
          ]}
        >
          <Icon size={18} color={featured ? colors.champagne : colors.accent} strokeWidth={1.75} />
        </View>
        <View style={styles.titles}>
          <Text variant="bodyStrong" style={{ color: ink }} numberOfLines={1}>
            {f.text(job.service.name)}
          </Text>
          <Text variant="caption" style={{ color: soft }} numberOfLines={1}>
            {job.customer.fullName} · {job.reference}
          </Text>
        </View>
        {job.status !== 'pending' ? (
          <Badge
            label={f.text(bookingStatusLabels[job.status])}
            tone={bookingStatusTone[job.status]}
            dot={isLiveStatus(job.status)}
          />
        ) : null}
      </View>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Clock size={14} color={soft} strokeWidth={1.75} />
          <Text variant="caption" style={{ color: soft }}>
            {f.date(job.scheduledStart, 'dayMonth')} ·{' '}
            {f.timeRange(job.scheduledStart, job.scheduledEnd)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin size={14} color={soft} strokeWidth={1.75} />
          <Text variant="caption" style={{ color: soft }} numberOfLines={1}>
            {area ? area.name[locale] : f.address(job.address)}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.footer,
          { borderTopColor: featured ? 'rgba(255,255,255,0.12)' : colors.hairline },
        ]}
      >
        <Text
          variant="captionStrong"
          style={{ color: featured ? colors.champagne : colors.accent }}
        >
          {t('pro.youEarn', { amount: f.money(job.technicianNet) })}
        </Text>
        <Text variant="caption" style={{ color: soft }}>
          {f.duration(job.price.estimatedDurationMin)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 2 },
  meta: { gap: space.xs, marginTop: space.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
