import { type BookingView, paymentMethodLabels } from '@myhome/shared';
import { CircleCheck, CircleX, ShieldCheck, Star } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RatingInput } from '@/components/booking/RatingInput';
import { Badge } from '@/components/ui/Badge';
import { Photo } from '@/components/ui/Photo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useRespondToExtraCharge, useSubmitReview } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Extra work quoted on site; pending items need the customer's decision. */
export function ExtraChargesCard({ booking }: { booking: BookingView }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const respond = useRespondToExtraCharge();
  const [busy, setBusy] = useState<string | null>(null);
  // Approving or declining changes the bill and cannot be undone — ask first.
  const [asking, setAsking] = useState<{ chargeId: string; approve: boolean } | null>(null);
  if (booking.extraCharges.length === 0) return null;
  const askingCharge = asking
    ? booking.extraCharges.find((c) => c.id === asking.chargeId)
    : undefined;
  const pending = booking.extraCharges.some((c) => c.status === 'pending_approval');

  const answer = (chargeId: string, approve: boolean) => {
    setBusy(`${chargeId}:${approve}`);
    respond.mutate(
      { bookingId: booking.id, chargeId, approve },
      {
        onSuccess: () =>
          show(t(approve ? 'booking.approvedToast' : 'booking.declinedToast'), 'success'),
        onError: (e) => show(errorMessage(e)),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <Card style={pending ? { borderColor: colors.warning } : undefined}>
      <Text variant="title3">{t(pending ? 'booking.extrasTitle' : 'booking.extrasDoneTitle')}</Text>
      {pending ? (
        <Text variant="caption" tone="secondary" style={styles.extrasBody}>
          {t('booking.extrasBody')}
        </Text>
      ) : null}
      <View style={styles.extras}>
        {booking.extraCharges.map((charge) => (
          <View key={charge.id} style={[styles.extra, { borderTopColor: colors.hairline }]}>
            <View style={styles.extraRow}>
              <Text variant="bodyStrong" style={styles.flex}>
                {charge.description}
              </Text>
              <Text variant="calloutStrong">{f.money(charge.amount)}</Text>
            </View>
            {charge.status === 'pending_approval' ? (
              <View style={styles.extraActions}>
                <Button
                  label={t('booking.decline')}
                  icon={CircleX}
                  variant="secondary"
                  size="sm"
                  style={styles.flex}
                  disabled={busy !== null}
                  loading={busy === `${charge.id}:false`}
                  onPress={() => setAsking({ chargeId: charge.id, approve: false })}
                />
                <Button
                  label={t('booking.approve')}
                  icon={CircleCheck}
                  size="sm"
                  style={styles.flex}
                  disabled={busy !== null}
                  loading={busy === `${charge.id}:true`}
                  onPress={() => setAsking({ chargeId: charge.id, approve: true })}
                />
              </View>
            ) : (
              <Badge
                label={t(
                  charge.status === 'approved' ? 'booking.extraApproved' : 'booking.extraDeclined',
                )}
                tone={charge.status === 'approved' ? 'success' : 'neutral'}
              />
            )}
          </View>
        ))}
      </View>
      <ConfirmDialog
        visible={asking !== null && askingCharge !== undefined}
        title={
          asking?.approve
            ? t('booking.approveExtraTitle', { amount: f.money(askingCharge?.amount ?? 0) })
            : t('booking.declineExtraTitle')
        }
        body={
          asking?.approve
            ? t('booking.approveExtraBody', { description: askingCharge?.description ?? '' })
            : t('booking.declineExtraBody', { description: askingCharge?.description ?? '' })
        }
        confirmLabel={asking?.approve ? t('booking.approve') : t('booking.decline')}
        destructive={asking ? !asking.approve : false}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (asking) answer(asking.chargeId, asking.approve);
          setAsking(null);
        }}
      />
    </Card>
  );
}

/** How the booking is paid; all electronic payments are simulated. */
export function PaymentCard({ booking }: { booking: BookingView }) {
  const { t } = useLocale();
  const f = useFormat();
  const { payment } = booking;
  const rows: { label: string; value: string }[] = [
    { label: t('booking.method'), value: f.text(paymentMethodLabels[payment.method]) },
  ];
  if (payment.paidAmount > 0)
    rows.push({ label: t('booking.paid'), value: f.money(payment.paidAmount) });
  if (payment.refundedAmount > 0)
    rows.push({ label: t('booking.refunded'), value: f.money(payment.refundedAmount) });
  if (booking.balanceDue > 0 && booking.status !== 'cancelled') {
    rows.push({ label: t('booking.due'), value: f.money(booking.balanceDue) });
  }
  return (
    <Card>
      <View style={styles.paymentHead}>
        <Text variant="title3" style={styles.flex}>
          {t('booking.payment')}
        </Text>
        {payment.method !== 'cash' ? <Badge label={t('booking.simulated')} tone="info" /> : null}
      </View>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.extraRow}>
            <Text variant="callout" tone="secondary" style={styles.flex}>
              {row.label}
            </Text>
            <Text variant="calloutStrong">{row.value}</Text>
          </View>
        ))}
        {payment.reference ? (
          <Text variant="caption" tone="muted" style={styles.ltr}>
            {payment.reference}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Rating form after completion, or the submitted review. */
export function ReviewCard({
  booking,
  warrantyUntil,
}: {
  booking: BookingView;
  warrantyUntil?: string;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const submit = useSubmitReview();
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [comment, setComment] = useState('');
  const [tried, setTried] = useState(false);

  const warranty = warrantyUntil ? (
    <View style={[styles.warranty, { backgroundColor: colors.successSoft }]}>
      <ShieldCheck size={16} color={colors.success} strokeWidth={1.75} />
      <Text variant="caption" style={[styles.flex, { color: colors.successText }]}>
        {t('booking.warrantyUntil', { date: f.date(warrantyUntil, 'medium') })}
      </Text>
    </View>
  ) : null;

  if (booking.review) {
    return (
      <Card>
        <Text variant="title3">{t('booking.yourReview')}</Text>
        <View
          style={styles.stars}
          accessible
          accessibilityLabel={t('booking.ratingLabel', { count: booking.review.rating })}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={18}
              color={colors.accent}
              fill={n <= booking.review!.rating ? colors.accent : 'transparent'}
              strokeWidth={1.25}
            />
          ))}
        </View>
        {booking.review.comment ? (
          <Text variant="callout" tone="secondary">
            {booking.review.comment}
          </Text>
        ) : null}
        {warranty}
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="title3" align="center">
        {t('booking.rateTitle')}
      </Text>
      <Text variant="caption" tone="secondary" align="center" style={styles.rateBody}>
        {t('booking.rateBody')}
      </Text>
      <RatingInput value={rating} onChange={setRating} label={t('booking.rateTitle')} />
      {tried && rating === 0 ? (
        <Text variant="caption" tone="danger" align="center" style={styles.rateError}>
          {t('booking.ratingRequired')}
        </Text>
      ) : null}
      <View style={styles.reviewForm}>
        <TextField
          label={t('booking.yourReview')}
          placeholder={t('booking.commentPlaceholder')}
          value={comment}
          onChangeText={setComment}
          maxLength={500}
          multiline
        />
        <Button
          label={t('booking.submitReview')}
          fullWidth
          loading={submit.isPending}
          onPress={() => {
            setTried(true);
            if (rating === 0) return;
            submit.mutate(
              { bookingId: booking.id, rating, comment: comment.trim() },
              {
                onSuccess: () => show(t('booking.reviewThanks'), 'success'),
                onError: (e) => show(errorMessage(e)),
              },
            );
          }}
        />
        {warranty}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ltr: { writingDirection: 'ltr' },
  extrasBody: { marginTop: space.xs },
  extras: { marginTop: space.md },
  extra: {
    gap: space.sm,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'flex-start',
  },
  extraRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', alignSelf: 'stretch' },
  extraActions: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
  paymentHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rows: { gap: space.sm, marginTop: space.md },
  stars: { flexDirection: 'row', gap: 4, marginVertical: space.sm },
  rateBody: { marginTop: space.xs, marginBottom: space.lg },
  rateError: { marginTop: space.sm },
  reviewForm: { gap: space.md, marginTop: space.lg },
  warranty: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space.md,
  },
});

/** Notes and photos the professional recorded during the visit. */
export function WorkRecordCard({ booking }: { booking: BookingView }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const notes = booking.workNotes ?? [];
  const photos = booking.workPhotos ?? [];
  if (!notes.length && !photos.length) return null;
  return (
    <Card>
      <Text variant="title3">{t('booking.workTitle')}</Text>
      {notes.length ? (
        <View style={workStyles.workBlock}>
          <Text variant="captionStrong" tone="secondary">
            {t('booking.workNotes')}
          </Text>
          {notes.map((note) => (
            <View key={note.id} style={workStyles.workNote}>
              <Text variant="callout" natural>
                {note.text}
              </Text>
              <Text variant="caption" tone="muted">
                {f.date(note.createdAt, 'dayMonth')} · {f.time(note.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {photos.length ? (
        <View style={workStyles.workBlock}>
          <Text variant="captionStrong" tone="secondary">
            {t('booking.workPhotos')}
          </Text>
          <View style={workStyles.workPhotos}>
            {photos.map((photo) => (
              <View key={photo.id}>
                <Photo media={photo.media} style={workStyles.workPhoto} />
                <View style={[workStyles.workStage, { backgroundColor: colors.midnight }]}>
                  <Text variant="captionStrong" style={{ color: colors.champagne }}>
                    {t(photo.stage === 'before' ? 'job.before' : 'job.after')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const workStyles = StyleSheet.create({
  workBlock: { gap: space.sm, marginTop: space.md },
  workNote: { gap: 2 },
  workPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  workPhoto: { width: 88, height: 88, borderRadius: radius.md },
  workStage: {
    position: 'absolute',
    bottom: space.xs,
    start: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
  },
});
