import {
  bookingStatusLabels,
  bookingStatusTone,
  getArea,
  isApiError,
  isLiveStatus,
  kuwaitDateOf,
  paymentMethodLabels,
} from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarClock,
  CircleCheck,
  Clock,
  MapPin,
  MessageSquareText,
  Navigation,
  NotebookText,
  Paperclip,
  Phone,
  Play,
  SearchX,
  Star,
  UserRound,
  X,
} from '@/components/ui/icons';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { StatusTimeline } from '@/components/booking/StatusTimeline';
import { InfoRow, SummaryCard } from '@/components/booking/Summary';
import {
  ExtraChargesSection,
  WorkNotesSection,
  WorkPhotosSection,
} from '@/components/pro/JobSections';
import { PriceSummary } from '@/components/service/PriceSummary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ScreenHeader } from '@/components/ui/Headers';
import { Photo } from '@/components/ui/Photo';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useAcceptOffer, useAdvanceJob, useDeclineOffer, useJob } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import type { TKey } from '@/i18n/translate';
import { nextJobAction } from '@/lib/jobActions';
import { proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Dialog = 'accept' | 'decline' | 'travel' | 'complete' | null;

const ADVANCED_TOAST: Record<string, TKey> = {
  on_the_way: 'job.travelStarted',
  arrived: 'job.arrivedToast',
  in_progress: 'job.startedToast',
  completed: 'job.completedToast',
};

/** A job (or job request) from the professional's side, with the next workflow step. */
export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const now = useNow();
  const job = useJob(id);
  const accept = useAcceptOffer();
  const decline = useDeclineOffer();
  const advance = useAdvanceJob();
  const [dialog, setDialog] = useState<Dialog>(null);

  const j = job.data;
  const header = (
    <ScreenHeader
      back
      fallbackHref="/pro/jobs"
      title={j ? f.text(j.service.name) : t('job.request')}
      subtitle={j?.reference}
    />
  );

  if (job.isPending) {
    return (
      <Screen header={header}>
        <Skeleton height={140} rounded={radius.xl} />
        <SkeletonList count={2} height={120} />
      </Screen>
    );
  }
  if (job.isError || !j) {
    return (
      <Screen header={header}>
        {isApiError(job.error) && job.error.code === 'NOT_FOUND' ? (
          <EmptyState
            icon={SearchX}
            title={t('job.notFound')}
            actionLabel={t('pro.jobsTitle')}
            onAction={() => router.replace(proRoutes.jobs())}
          />
        ) : (
          <ErrorState onRetry={() => void job.refetch()} />
        )}
      </Screen>
    );
  }

  const area = getArea(j.address.areaId);
  const areaName = area ? area.name[locale] : f.address(j.address, 'short');
  const action = nextJobAction(j, kuwaitDateOf(now));
  const pendingExtras = j.extraCharges.some((c) => c.status === 'pending_approval');
  const busy = accept.isPending || decline.isPending || advance.isPending;

  const runAdvance = () =>
    advance.mutate(j.id, {
      onSuccess: (updated) => {
        setDialog(null);
        const key = ADVANCED_TOAST[updated.status];
        if (key) show(t(key), 'success');
      },
      onError: (e) => {
        setDialog(null);
        show(pendingExtras ? t('job.extrasPending') : errorMessage(e));
      },
    });

  const openMaps = () => {
    const { lat, lng } = j.address.location;
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const footer =
    action.kind === 'offer' ? (
      <View style={styles.footerRow}>
        <Button
          label={t('job.decline')}
          icon={X}
          variant="secondary"
          style={styles.flex}
          disabled={busy}
          onPress={() => setDialog('decline')}
        />
        <Button
          label={t('job.accept')}
          icon={CircleCheck}
          style={styles.flex}
          disabled={busy}
          onPress={() => setDialog('accept')}
        />
      </View>
    ) : action.kind === 'advance' ? (
      <View style={styles.footerStack}>
        {action.blockedUntil ? (
          <Text variant="caption" tone="muted" align="center">
            {t('job.notToday', { date: f.date(j.scheduledStart, 'full') })}
          </Text>
        ) : null}
        {action.next === 'completed' && pendingExtras ? (
          <Text variant="caption" tone="danger" align="center">
            {t('job.extrasPending')}
          </Text>
        ) : null}
        <Button
          label={t(action.label)}
          icon={
            action.next === 'on_the_way'
              ? Navigation
              : action.next === 'completed'
                ? CircleCheck
                : Play
          }
          fullWidth
          loading={advance.isPending}
          disabled={!!action.blockedUntil || (action.next === 'completed' && pendingExtras)}
          onPress={() =>
            action.next === 'on_the_way'
              ? setDialog('travel')
              : action.next === 'completed'
                ? setDialog('complete')
                : runAdvance()
          }
        />
      </View>
    ) : undefined;

  return (
    <Screen
      header={header}
      refreshing={job.isRefetching}
      onRefresh={() => void job.refetch()}
      footer={footer}
    >
      {/* Summary */}
      <Card>
        <View style={styles.summary}>
          <Photo media={j.service.image} style={styles.thumb} />
          <View style={styles.flex}>
            {j.status === 'pending' ? (
              <Badge label={t('job.request')} tone="info" />
            ) : (
              <Badge
                label={f.text(bookingStatusLabels[j.status])}
                tone={bookingStatusTone[j.status]}
                dot={isLiveStatus(j.status)}
              />
            )}
            <Text variant="title3" style={styles.serviceName}>
              {f.text(j.service.name)}
            </Text>
            <Text variant="caption" tone="muted">
              {f.text(j.category.name)} · {j.reference}
            </Text>
          </View>
        </View>
        <View style={[styles.earn, { borderTopColor: colors.hairline }]}>
          <View style={styles.earnMain}>
            <Text variant="caption" tone="muted">
              {t(j.status === 'completed' ? 'job.earnedLabel' : 'job.youEarn')}
            </Text>
            <Text variant="title2" style={{ color: colors.accentText }}>
              {f.money(j.technicianNet)}
            </Text>
          </View>
          <View style={styles.earnMeta}>
            <Text variant="caption" tone="secondary">
              {t('job.jobTotal', { amount: f.money(j.price.total) })}
            </Text>
            <Text variant="caption" tone="muted">
              {t('job.commission', { amount: f.money(j.commission) })}
            </Text>
          </View>
        </View>
      </Card>

      <SummaryCard>
        <InfoRow
          icon={CalendarClock}
          label={t('job.when')}
          value={f.date(j.scheduledStart, 'full')}
          detail={f.timeRange(j.scheduledStart, j.scheduledEnd)}
        />
        <InfoRow
          icon={Clock}
          label={t('job.duration')}
          value={f.duration(j.price.estimatedDurationMin)}
        />
        <View style={styles.block}>
          <InfoRow
            icon={MapPin}
            label={`${t('job.address')} · ${areaName}`}
            value={f.address(j.address, 'full')}
          />
          {j.status !== 'completed' && j.status !== 'cancelled' ? (
            <>
              <Button
                label={t('job.directions')}
                icon={Navigation}
                variant="secondary"
                size="sm"
                style={styles.inlineAction}
                onPress={openMaps}
              />
              <Text variant="caption" tone="muted">
                {t('job.directionsNote', { area: areaName })}
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.block}>
          <InfoRow icon={UserRound} label={t('job.customer')} value={j.customer.fullName} />
          {j.status !== 'pending' && j.status !== 'cancelled' ? (
            <View style={styles.contactRow}>
              <Button
                label={t('job.call')}
                icon={Phone}
                variant="secondary"
                size="sm"
                style={styles.contact}
                onPress={() => void Linking.openURL(`tel:${j.customer.phone}`)}
              />
              {j.chatThreadId ? (
                <Button
                  label={t('job.message')}
                  icon={MessageSquareText}
                  variant="secondary"
                  size="sm"
                  style={styles.contact}
                  onPress={() => router.push(proRoutes.chat(j.chatThreadId!))}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </SummaryCard>

      <SummaryCard>
        <InfoRow
          icon={NotebookText}
          label={t('job.customerNotes')}
          value={j.customerNotes ?? t('job.noCustomerNotes')}
        />
        <InfoRow icon={Paperclip} label={t('job.attachments')} value={t('job.noAttachments')} />
      </SummaryCard>

      {j.status === 'confirmed' || j.status === 'on_the_way' ? (
        <DemoNotice text={t('job.trackingNote')} />
      ) : null}

      <ExtraChargesSection job={j} />
      <WorkNotesSection job={j} />
      <WorkPhotosSection job={j} />

      {j.status !== 'pending' ? (
        <Card>
          <Text variant="title3" style={styles.cardTitle}>
            {t('job.timeline')}
          </Text>
          <StatusTimeline booking={j} />
        </Card>
      ) : null}

      <PriceSummary price={j.price} />
      <Card tone="muted">
        <Text variant="captionStrong" tone="secondary">
          {t('job.payment')}
        </Text>
        <Text variant="callout" style={styles.paymentLine}>
          {j.payment.method === 'cash'
            ? t('job.collectCash', { amount: f.money(j.balanceDue || j.price.total) })
            : `${t('job.paymentMethod', { method: f.text(paymentMethodLabels[j.payment.method]) })} · ${t('job.prepaid')}`}
        </Text>
      </Card>

      {j.status === 'completed' ? (
        <Card>
          <Text variant="title3" style={styles.cardTitle}>
            {t('job.review')}
          </Text>
          {j.review ? (
            <>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={16}
                    color={colors.accent}
                    fill={n <= j.review!.rating ? colors.accent : 'transparent'}
                    strokeWidth={1.25}
                  />
                ))}
              </View>
              {j.review.comment ? (
                <Text variant="callout" tone="secondary" natural>
                  {j.review.comment}
                </Text>
              ) : null}
            </>
          ) : (
            <Text variant="callout" tone="muted">
              {t('job.noReview')}
            </Text>
          )}
        </Card>
      ) : null}

      <ConfirmDialog
        visible={dialog === 'accept'}
        title={t('job.acceptTitle')}
        body={t('job.acceptBody', {
          service: f.text(j.service.name),
          date: f.date(j.scheduledStart, 'dayMonth'),
          time: f.timeRange(j.scheduledStart, j.scheduledEnd),
          area: areaName,
          amount: f.money(j.technicianNet),
        })}
        confirmLabel={t('job.accept')}
        loading={accept.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          accept.mutate(j.id, {
            onSuccess: () => {
              setDialog(null);
              show(t('job.accepted'), 'success');
            },
            onError: (e) => {
              setDialog(null);
              show(
                isApiError(e) && e.code === 'CONFLICT'
                  ? e.message.includes('already have')
                    ? t('job.conflict')
                    : t('job.unavailable')
                  : errorMessage(e),
              );
            },
          })
        }
      />
      <ConfirmDialog
        visible={dialog === 'decline'}
        title={t('job.declineTitle')}
        body={t('job.declineBody')}
        confirmLabel={t('job.decline')}
        destructive
        loading={decline.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          decline.mutate(
            { bookingId: j.id },
            {
              onSuccess: () => {
                setDialog(null);
                show(t('job.declined'), 'success');
                if (router.canGoBack()) router.back();
                else router.replace(proRoutes.jobs('requests'));
              },
              onError: (e) => {
                setDialog(null);
                show(
                  isApiError(e) && e.code === 'CONFLICT' ? t('job.unavailable') : errorMessage(e),
                );
              },
            },
          )
        }
      />
      <ConfirmDialog
        visible={dialog === 'travel'}
        title={t('job.startTravelTitle')}
        body={t('job.startTravelBody')}
        confirmLabel={t('job.startTravel')}
        loading={advance.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={runAdvance}
      />
      <ConfirmDialog
        visible={dialog === 'complete'}
        title={t('job.completeTitle')}
        body={t('job.completeBody')}
        confirmLabel={t('job.complete')}
        loading={advance.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={runAdvance}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  summary: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  serviceName: { marginTop: space.xs },
  earn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: space.md,
    marginTop: space.lg,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  earnMain: { gap: 2, minWidth: 150 },
  earnMeta: { alignItems: 'flex-end', gap: 2, flexGrow: 1 },
  block: { gap: space.sm },
  inlineAction: { alignSelf: 'flex-start' },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  contact: { flexGrow: 1, flexBasis: 130 },
  cardTitle: { marginBottom: space.lg },
  paymentLine: { marginTop: space.xs },
  stars: { flexDirection: 'row', gap: 4, marginBottom: space.sm },
  footerRow: { flexDirection: 'row', gap: space.sm },
  footerStack: { gap: space.sm },
});
