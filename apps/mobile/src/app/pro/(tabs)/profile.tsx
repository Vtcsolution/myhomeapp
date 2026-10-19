import {
  kuwaitDateOf,
  kuwaitLocalToISO,
  spokenLanguageLabels,
  technicianStatusLabels,
  weekdayName,
} from '@myhome/shared';
import { router } from 'expo-router';
import { Bell, BellRing, CalendarClock, FileText, MessagesSquare, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import {
  PreferencesSection,
  SectionLabel,
  SessionSection,
} from '@/components/account/SettingsSections';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import {
  useCategories,
  useChatThreads,
  useGovernorates,
  useTechnicianProfile,
  useUnreadCount,
} from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import { WEEKDAYS } from '@/lib/availabilityForm';
import { proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function ProProfile() {
  const { t, locale, brandName } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const now = useNow();
  const profile = useTechnicianProfile();
  const categories = useCategories();
  const governorates = useGovernorates();
  const threads = useChatThreads();
  const unread = useUnreadCount();
  const p = profile.data;
  const today = kuwaitDateOf(now);
  const clock = (hhmm: string) => f.time(kuwaitLocalToISO(today, hhmm));
  const attention = p?.documents.filter(
    (d) => d.status === 'expired' || d.status === 'rejected',
  ).length;
  const unreadChats = threads.data?.reduce((s, th) => s + th.unread, 0) ?? 0;
  const count = (n: number | undefined) =>
    n ? <Badge label={String(n)} tone="accent" /> : undefined;

  return (
    <Screen
      header={<ScreenHeader title={t('tabs.profile')} />}
      refreshing={profile.isRefetching}
      onRefresh={() => void profile.refetch()}
    >
      <Card>
        {p ? (
          <View style={styles.identity}>
            <View style={styles.row}>
              <Avatar name={p.fullName.en} size={64} />
              <View style={styles.texts}>
                <Text variant="title2" numberOfLines={2}>
                  {f.text(p.fullName)}
                </Text>
                <Text variant="callout" tone="secondary">
                  {f.text(p.headline)}
                </Text>
                <View style={styles.badges}>
                  <Badge
                    label={p.vendor ? f.text(p.vendor.name) : t('profile.independent')}
                    tone={p.vendor ? 'info' : 'accent'}
                  />
                  <Badge
                    label={f.text(technicianStatusLabels[p.status])}
                    tone={p.status === 'active' ? 'success' : 'warning'}
                  />
                </View>
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
            <Text variant="caption" tone="muted">
              {t('profile.memberSince', { date: f.date(p.joinedAt, 'medium') })}
            </Text>
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

      {p ? (
        <Card>
          <Text variant="title3" accessibilityRole="header">
            {t('profile.details')}
          </Text>
          <Detail label={t('profile.about')}>
            <Text variant="callout" tone="secondary">
              {f.text(p.bio)}
            </Text>
          </Detail>
          <Detail label={t('profile.skills')}>
            <Tags
              items={(categories.data ?? [])
                .filter((c) => p.categoryIds.includes(c.id))
                .map((c) => f.text(c.name))}
            />
          </Detail>
          <Detail label={t('profile.areas')}>
            <Tags
              items={(governorates.data ?? [])
                .filter((g) => p.governorateIds.includes(g.id))
                .map((g) => f.text(g.name))}
            />
          </Detail>
          <Detail label={t('profile.languages')}>
            <Tags items={p.languages.map((l) => f.text(spokenLanguageLabels[l]))} />
          </Detail>
          <Text variant="caption" tone="muted" style={styles.readOnly}>
            {t('profile.readOnly', { brand: brandName })}
          </Text>
        </Card>
      ) : null}

      {p ? (
        <Card>
          <View style={styles.hoursHead}>
            <Text variant="title3" style={styles.flex} accessibilityRole="header">
              {t('profile.hours')}
            </Text>
            <Button
              label={t('profile.editAvailability')}
              icon={CalendarClock}
              variant="ghost"
              size="sm"
              onPress={() => router.push(proRoutes.availability)}
            />
          </View>
          <View style={styles.hours}>
            {WEEKDAYS.map((day) => {
              const hours = p.availability.weekly[day];
              return (
                <View key={day} style={styles.hourRow}>
                  <Text variant="callout" tone="secondary" style={styles.flex}>
                    {weekdayName(day, locale)}
                  </Text>
                  <Text variant="calloutStrong" tone={hours ? 'primary' : 'muted'}>
                    {hours ? `${clock(hours.start)} – ${clock(hours.end)}` : t('availability.off')}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>{t('profile.work')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={CalendarClock}
            title={t('profile.availability')}
            onPress={() => router.push(proRoutes.availability)}
          />
          <ListRow
            icon={Star}
            title={t('profile.reviews')}
            trailing={p ? String(p.reviewsCount) : undefined}
            onPress={() => router.push(proRoutes.reviews)}
          />
          <ListRow
            icon={FileText}
            title={t('profile.documents')}
            trailing={attention ? <Badge label={String(attention)} tone="warning" /> : undefined}
            onPress={() => router.push(proRoutes.documents)}
          />
          <ListRow
            icon={MessagesSquare}
            title={t('profile.messages')}
            trailing={count(unreadChats)}
            onPress={() => router.push('/pro/messages')}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <SectionLabel>{t('profile.settings')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={Bell}
            title={t('account.notifications')}
            trailing={count(unread.data)}
            onPress={() => router.push(proRoutes.notifications)}
          />
          <ListRow
            icon={BellRing}
            title={t('profile.notificationSettings')}
            onPress={() => router.push(proRoutes.notificationSettings)}
          />
        </ListGroup>
      </View>

      <PreferencesSection />
      <SessionSection />
    </Screen>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.detail}>
      <Text variant="captionStrong" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Tags({ items }: { items: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tags}>
      {items.map((item) => (
        <View key={item} style={[styles.tag, { backgroundColor: colors.surfaceMuted }]}>
          <Text variant="captionStrong">{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  texts: { flex: 1, gap: space.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
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
  detail: { gap: space.xs, marginTop: space.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  readOnly: { marginTop: space.lg },
  hoursHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hours: { gap: space.sm, marginTop: space.md },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  section: { gap: space.sm },
});
