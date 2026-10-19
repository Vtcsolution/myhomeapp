import { isLiveStatus } from '@myhome/shared';
import { router } from 'expo-router';
import { Bell, Briefcase, CalendarCheck, Power } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { JobCard } from '@/components/pro/JobCard';
import { OnlineToggle } from '@/components/pro/OnlineToggle';
import { StatTile } from '@/components/pro/StatTile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Headers';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import {
  useSetOnline,
  useTechnicianDashboard,
  useTechnicianProfile,
  useUnreadCount,
} from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useGreeting } from '@/hooks/useGreeting';
import { useNow } from '@/hooks/useNow';
import { useNextStage } from '@/hooks/useNextStage';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function ProToday() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const nextStage = useNextStage();
  const now = useNow();
  const profile = useTechnicianProfile();
  const dashboard = useTechnicianDashboard();
  const unread = useUnreadCount();
  const setOnline = useSetOnline();
  const greeting = useGreeting(
    profile.data?.fullName.en ? f.text(profile.data.fullName) : undefined,
  );

  const online = profile.data?.isOnline ?? dashboard.data?.isOnline ?? false;
  const data = dashboard.data;
  const openJob = () => nextStage('features.jobDetails', 6);

  return (
    <Screen
      refreshing={dashboard.isRefetching}
      onRefresh={() => {
        void dashboard.refetch();
        void profile.refetch();
        void unread.refetch();
      }}
      contentStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="overline" tone="muted">
            {f.date(now, 'full')}
          </Text>
          {profile.isPending ? (
            <Skeleton width={200} height={30} />
          ) : (
            <Text variant="title1" numberOfLines={1}>
              {greeting}
            </Text>
          )}
        </View>
        <IconButton
          icon={Bell}
          label={t('notifications.title')}
          badge={unread.data}
          onPress={() => router.push('/pro/notifications')}
        />
      </View>

      <View style={styles.statusRow}>
        <OnlineToggle
          online={online}
          busy={setOnline.isPending}
          onToggle={() => setOnline.mutate(!online)}
        />
        {profile.data?.vendor ? (
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.vendor}>
            {f.text(profile.data.vendor.name)}
          </Text>
        ) : null}
      </View>

      {!online && profile.data ? (
        <Card tone="muted">
          <View style={styles.offline}>
            <View style={[styles.offlineIcon, { borderColor: colors.border }]}>
              <Power size={20} color={colors.textSecondary} strokeWidth={1.75} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{t('pro.offlineTitle')}</Text>
              <Text variant="callout" tone="secondary">
                {t('pro.offlineBody')}
              </Text>
            </View>
          </View>
          <Button
            label={t('pro.goOnline')}
            size="md"
            loading={setOnline.isPending}
            onPress={() => setOnline.mutate(true)}
            style={styles.goOnline}
          />
        </Card>
      ) : null}

      {dashboard.isPending ? (
        <SkeletonList count={2} height={96} />
      ) : dashboard.isError || !data ? (
        <ErrorState onRetry={() => void dashboard.refetch()} />
      ) : (
        <>
          <View style={styles.stats}>
            <StatTile label={t('pro.today')} value={f.money(data.earningsToday)} />
            <StatTile label={t('pro.thisWeek')} value={f.money(data.earningsWeek)} />
            <StatTile label={t('pro.rating')} value={data.rating ? f.rating(data.rating) : '—'} />
            <StatTile label={t('pro.acceptance')} value={f.percent(data.acceptanceRate)} />
          </View>

          {data.nextJob ? (
            <View style={styles.section}>
              <SectionHeader
                title={isLiveStatus(data.nextJob.status) ? t('pro.inProgress') : t('pro.nextJob')}
              />
              <JobCard job={data.nextJob} featured onPress={openJob} />
            </View>
          ) : null}

          <Card>
            <View style={styles.requests}>
              <View style={[styles.requestIcon, { backgroundColor: colors.accentSoft }]}>
                <Briefcase size={20} color={colors.accent} strokeWidth={1.75} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">
                  {data.pendingOffers
                    ? t('pro.requests', { count: data.pendingOffers })
                    : t('pro.noRequests')}
                </Text>
                <Text variant="caption" tone="secondary">
                  {t('pro.requestsBody')}
                </Text>
              </View>
              {data.pendingOffers ? (
                <Button
                  label={t('pro.review')}
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    router.navigate({ pathname: '/pro/jobs', params: { tab: 'requests' } })
                  }
                />
              ) : null}
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader title={t('pro.schedule')} />
            {data.todayJobs.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title={t('pro.emptySchedule')}
                body={t('pro.emptyScheduleBody')}
              />
            ) : (
              <View style={styles.list}>
                {data.todayJobs.map((job) => (
                  <JobCard key={job.id} job={job} onPress={openJob} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg },
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: -space.md },
  vendor: { flexShrink: 1 },
  offline: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  offlineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goOnline: { marginTop: space.lg, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  section: { gap: space.lg },
  requests: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: space.md },
});
