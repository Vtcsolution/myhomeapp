import { router, useLocalSearchParams } from 'expo-router';
import { Briefcase, CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { JobCard } from '@/components/pro/JobCard';
import { ScheduleView } from '@/components/pro/ScheduleView';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useJobOffers, useJobs, useTechnicianProfile } from '@/data/queries';
import { proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { space } from '@/theme/tokens';

type Tab = 'requests' | 'schedule' | 'completed';

const asTab = (value: string | undefined): Tab | undefined =>
  value === 'requests' || value === 'completed'
    ? value
    : value === 'schedule' || value === 'upcoming'
      ? 'schedule'
      : undefined;

/** Jobs: open requests, the schedule (with availability) and completed work. */
export default function ProJobs() {
  const { t } = useLocale();
  const params = useLocalSearchParams<{ tab?: string }>();
  const requested = asTab(params.tab);
  // Follow the `tab` route parameter (e.g. "View requests" on Today) while
  // still letting the user switch tabs freely.
  const [selection, setSelection] = useState<{ tab: Tab; param?: Tab }>({
    tab: requested ?? 'schedule',
    param: requested,
  });
  if (requested !== selection.param) {
    setSelection({ tab: requested ?? selection.tab, param: requested });
  }
  const tab = selection.tab;
  const setTab = (next: Tab) => setSelection((s) => ({ ...s, tab: next }));

  const offers = useJobOffers();
  const all = useJobs('all');
  const completed = useJobs('completed');
  const profile = useTechnicianProfile();
  const query = tab === 'requests' ? offers : tab === 'schedule' ? all : completed;
  const open = (id: string) => router.push(proRoutes.job(id));

  return (
    <Screen
      header={<ScreenHeader title={t('pro.jobsTitle')} />}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
        void profile.refetch();
      }}
    >
      <SegmentedControl<Tab>
        accessibilityLabel={t('pro.jobsTitle')}
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'requests', label: t('pro.tabRequests') },
          { value: 'schedule', label: t('pro.tabSchedule') },
          { value: 'completed', label: t('pro.tabCompleted') },
        ]}
      />
      {query.isPending || (tab === 'schedule' && profile.isPending) ? (
        <SkeletonList count={3} height={150} />
      ) : query.isError || (tab === 'schedule' && profile.isError) ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
            void profile.refetch();
          }}
        />
      ) : tab === 'schedule' ? (
        <ScheduleView jobs={all.data ?? []} profile={profile.data!} />
      ) : query.data.length === 0 ? (
        tab === 'requests' ? (
          <EmptyState
            icon={Briefcase}
            title={t('pro.emptyRequests')}
            body={t('pro.emptyRequestsBody')}
          />
        ) : (
          <EmptyState icon={CircleCheck} title={t('pro.emptyCompleted')} />
        )
      ) : (
        <View style={styles.list}>
          {tab === 'requests' ? <DemoNotice text={t('pro.demoData')} /> : null}
          {query.data.slice(0, 30).map((job) => (
            <JobCard key={job.id} job={job} onPress={() => open(job.id)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
