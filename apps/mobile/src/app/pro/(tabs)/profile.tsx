import { router } from 'expo-router';
import { Bell, CalendarClock, FileText, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import {
  PreferencesSection,
  SectionLabel,
  SessionSection,
} from '@/components/account/SettingsSections';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTechnicianProfile } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useNextStage } from '@/hooks/useNextStage';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

export default function ProProfile() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const nextStage = useNextStage();
  const profile = useTechnicianProfile();
  const p = profile.data;

  return (
    <Screen header={<ScreenHeader title={t('tabs.profile')} />}>
      <Card>
        {p ? (
          <View style={styles.identity}>
            <View style={styles.row}>
              <Avatar name={p.fullName.en} size={64} />
              <View style={styles.texts}>
                <Text variant="title2" numberOfLines={1}>
                  {f.text(p.fullName)}
                </Text>
                <Text variant="callout" tone="secondary">
                  {f.text(p.headline)}
                </Text>
                <Badge
                  label={p.vendor ? f.text(p.vendor.name) : t('profile.independent')}
                  tone={p.vendor ? 'info' : 'accent'}
                />
              </View>
            </View>
            <View style={[styles.facts, { borderTopColor: colors.hairline }]}>
              <View style={styles.fact}>
                <Star size={16} color={colors.accent} fill={colors.accent} strokeWidth={1.5} />
                <Text variant="calloutStrong">{p.rating ? f.rating(p.rating) : '—'}</Text>
                <Text variant="caption" tone="muted">
                  ({p.reviewsCount})
                </Text>
              </View>
              <Text variant="caption" tone="secondary">
                {t('profile.experience', { count: p.yearsExperience })}
              </Text>
              <Text variant="caption" tone="secondary">
                {t('profile.jobsDone', { count: p.jobsCompleted })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Skeleton width={64} height={64} rounded={32} />
            <View style={styles.texts}>
              <Skeleton width={170} height={20} />
              <Skeleton width={120} height={14} />
            </View>
          </View>
        )}
      </Card>

      <View style={styles.section}>
        <SectionLabel>{t('profile.work')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={CalendarClock}
            title={t('profile.availability')}
            onPress={() => nextStage('features.availability', 6)}
          />
          <ListRow
            icon={FileText}
            title={t('profile.documents')}
            onPress={() => nextStage('features.documents', 6)}
          />
          <ListRow
            icon={Star}
            title={t('profile.reviews')}
            onPress={() => nextStage('features.reviews', 6)}
          />
          <ListRow
            icon={Bell}
            title={t('account.notifications')}
            onPress={() => router.push('/pro/notifications')}
          />
        </ListGroup>
      </View>

      <PreferencesSection />
      <SessionSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  texts: { flex: 1, gap: space.xs },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  section: { gap: space.sm },
});
