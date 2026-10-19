import { isLiveStatus, kuwaitDateOf } from '@myhome/shared';
import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Briefcase,
  CalendarCheck,
  Navigation,
  Power,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { JobCard } from '@/components/pro/JobCard';
import { OnlineToggle } from '@/components/pro/OnlineToggle';
import { StatTile } from '@/components/pro/StatTile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { SectionHeader } from '@/components/ui/Headers';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { PressableScale } from '@/components/ui/Pressable';
import {
  useJobs,
  useSetOnline,
  useTechnicianDashboard,
  useTechnicianProfile,
  useUnreadCount,
} from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useGreeting } from '@/hooks/useGreeting';
import { useNow } from '@/hooks/useNow';
import type { TKey } from '@/i18n/translate';
import { type AttentionReason, attentionItems } from '@/lib/attention';
import { nextJobAction } from '@/lib/jobActions';
import { proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function ProToday() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const now = useNow();
  const profile = useTechnicianProfile();
  const dashboard = useTechnicianDashboard();
  const upcoming = useJobs('upcoming');
  const unread = useUnreadCount();
  const setOnline = useSetOnline();
  const greeting = useGreeting(
    profile.data?.fullName.en ? f.text(profile.data.fullName) : undefined,
  );

  const online = profile.data?.isOnline ?? dashboard.data?.isOnline ?? false;
  const data = dashboard.data;
  const openJob = (id: string) => router.push(proRoutes.job(id));
  const attention = attentionItems(upcoming.data ?? [], now).slice(0, 3);
  const next = data?.nextJob ?? null;
  const nextAction = next ? nextJobAction(next, kuwaitDateOf(now)) : null;

  return (
    <Screen
      refreshing={dashboard.isRefetching}
      onRefresh={() => {
        void dashboard.refetch();
        void profile.refetch();
        void unread.refetch();
        void upcoming.refetch();
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

          <Text variant="caption" tone="secondary">
            {t('pro.completedWeek', { count: data.jobsCompletedWeek })}
          </Text>

          {attention.length ? (
            <View style={styles.section}>
              <SectionHeader title={t('pro.urgent')} />
              <Card padded={false}>
                {attention.map(({ job, reason }, i) => (
                  <PressableScale
                    key={job.id}
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityLabel={`${f.text(job.service.name)}, ${t(URGENT[reason], { reference: job.reference, time: f.time(job.scheduledStart) })}`}
                    onPress={() => openJob(job.id)}
                    style={[
                      styles.urgentRow,
                      i > 0 && {
                        borderTopColor: colors.hairline,
                        borderTopWidth: StyleSheet.hairlineWidth * 2,
                      },
                    ]}
                  >
                    <AlertCircle
                      size={18}
                      color={reason === 'extra' ? colors.warning : colors.accent}
                      strokeWidth={1.75}
                    />
                    <View style={styles.flex}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {f.text(job.service.name)}
                      </Text>
                      <Text variant="caption" tone="secondary">
                        {t(URGENT[reason], {
                          reference: job.reference,
                          time: f.time(job.scheduledStart),
                        })}
                      </Text>
                    </View>
                    <DirectionalIcon
                      icon={ArrowRight}
                      size={16}
                      color={colors.textMuted}
                      strokeWidth={1.75}
                    />
                  </PressableScale>
                ))}
              </Card>
            </View>
          ) : null}

          {next ? (
            <View style={styles.section}>
              <SectionHeader
                title={isLiveStatus(next.status) ? t('pro.inProgress') : t('pro.nextJob')}
              />
              <JobCard job={next} featured onPress={() => openJob(next.id)} />
              <Button
                label={
                  nextAction?.kind === 'advance' &&
                  nextAction.next === 'on_the_way' &&
                  !nextAction.blockedUntil
                    ? t('pro.startTravel')
                    : t('pro.openJob')
                }
                icon={
                  nextAction?.kind === 'advance' && nextAction.next === 'on_the_way'
                    ? Navigation
                    : undefined
                }
                fullWidth
                onPress={() => openJob(next.id)}
              />
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
                  label={t('pro.viewRequests')}
                  size="sm"
                  variant="secondary"
                  onPress={() => router.navigate(proRoutes.jobs('requests'))}
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
                  <JobCard key={job.id} job={job} onPress={() => openJob(job.id)} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
      <DemoNotice text={t('pro.demoData')} />
    </Screen>
  );
}

const URGENT: Record<AttentionReason, TKey> = {
  extra: 'pro.urgentExtra',
  live: 'pro.urgentLive',
  soon: 'pro.urgentSoon',
};

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
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
