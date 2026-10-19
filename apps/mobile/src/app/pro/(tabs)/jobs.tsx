import { useLocalSearchParams } from 'expo-router';
import { Briefcase, CalendarClock, CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { JobCard } from '@/components/pro/JobCard';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useJobOffers, useJobs } from '@/data/queries';
import { useNextStage } from '@/hooks/useNextStage';
import { useLocale } from '@/providers/LocaleProvider';
import { space } from '@/theme/tokens';

type Tab = 'requests' | 'upcoming' | 'completed';

export default function ProJobs() {
  const { t } = useLocale();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const nextStage = useNextStage();
  // Follow the `tab` route parameter (e.g. "Review requests" on Today) while
  // still letting the user switch tabs freely.
  const [selection, setSelection] = useState<{ tab: Tab; param?: Tab }>({
    tab: params.tab ?? 'upcoming',
    param: params.tab,
  });
  if (params.tab !== selection.param) {
    setSelection({ tab: params.tab ?? selection.tab, param: params.tab });
  }
  const tab = selection.tab;
  const setTab = (next: Tab) => setSelection((s) => ({ ...s, tab: next }));

  const offers = useJobOffers();
  const upcoming = useJobs('upcoming');
  const completed = useJobs('completed');
  const query = tab === 'requests' ? offers : tab === 'upcoming' ? upcoming : completed;

  const empty = {
    requests: { icon: Briefcase, title: t('pro.emptyRequests'), body: t('pro.emptyRequestsBody') },
    upcoming: { icon: CalendarClock, title: t('pro.emptyUpcoming'), body: undefined },
    completed: { icon: CircleCheck, title: t('pro.emptyCompleted'), body: undefined },
  }[tab];

  return (
    <Screen
      header={<ScreenHeader title={t('pro.jobsTitle')} />}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <SegmentedControl<Tab>
        accessibilityLabel={t('pro.jobsTitle')}
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'requests', label: t('pro.tabRequests') },
          { value: 'upcoming', label: t('pro.tabUpcoming') },
          { value: 'completed', label: t('pro.tabCompleted') },
        ]}
      />
      {query.isPending ? (
        <SkeletonList count={3} height={150} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={empty.icon} title={empty.title} body={empty.body} />
      ) : (
        <View style={styles.list}>
          {query.data.slice(0, 30).map((job) => (
            <JobCard key={job.id} job={job} onPress={() => nextStage('features.jobDetails', 6)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
