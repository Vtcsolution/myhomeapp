import {
  addressTitle,
  allowedTransitions,
  type BookingStatus,
  bookingStatusLabels,
  getArea,
  isApiError,
  paymentMethodLabels,
  paymentStatusLabels,
} from '@myhome/shared';
import { ArrowRight, CircleX, SearchX, Star, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Avatar,
  Badge,
  BookingStatusBadge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  KeyValues,
  LoadingRows,
  Notice,
  Textarea,
} from '@/components/ui';
import {
  useAssignTechnician,
  useBooking,
  useEligibleTechnicians,
  useTickets,
  useUpdateBookingStatus,
} from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { mediaUrl } from '@/lib/media';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const booking = useBooking(id);
  const tickets = useTickets({ bookingId: id });
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const updateStatus = useUpdateBookingStatus();

  const crumbs = [
    { label: t('nav.dashboard'), to: '/' },
    { label: t('bookings.title'), to: '/bookings' },
  ];

  if (booking.isPending) {
    return (
      <div className="page">
        <PageHeader title={t('common.loading')} crumbs={crumbs} />
        <Card>
          <LoadingRows rows={8} />
        </Card>
      </div>
    );
  }
  if (booking.isError || !booking.data) {
    const missing = isApiError(booking.error) && booking.error.code === 'NOT_FOUND';
    return (
      <div className="page">
        <PageHeader title={t('bookings.title')} crumbs={crumbs} />
        <Card>
          {missing ? (
            <EmptyState
              icon={SearchX}
              title={t('common.notFound')}
              body={t('common.notFoundBody')}
            />
          ) : (
            <ErrorState onRetry={() => void booking.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const b = booking.data;
  const area = getArea(b.address.areaId);
  const canAssign = b.status === 'pending' || b.status === 'confirmed';
  const moves = allowedTransitions(b.status, 'admin').filter(
    (s) => s !== 'confirmed' && s !== 'cancelled',
  );
  const canCancel = allowedTransitions(b.status, 'admin').includes('cancelled');
  const statusLabel = (s: BookingStatus) => f.text(bookingStatusLabels[s]);

  const changeStatus = (status: BookingStatus, note?: string) =>
    updateStatus.mutate(
      { bookingId: b.id, status, ...(note ? { note } : {}) },
      {
        onSuccess: () => {
          setPendingStatus(null);
          setCancelOpen(false);
          setReason('');
          show(
            status === 'cancelled'
              ? t('booking.cancelled')
              : t('booking.statusChanged', { status: statusLabel(status) }),
          );
        },
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );

  return (
    <div className="page">
      <PageHeader
        title={t('booking.title', { reference: b.reference })}
        subtitle={`${f.text(b.service.name)} · ${f.text(b.category.name)}`}
        crumbs={[...crumbs, { label: b.reference }]}
        badge={<BookingStatusBadge status={b.status} />}
        actions={
          <>
            {canAssign ? (
              <Button variant="primary" icon={UserPlus} onClick={() => setAssignOpen(true)}>
                {b.technician ? t('booking.reassign') : t('booking.assign')}
              </Button>
            ) : null}
            {moves.map((s) => (
              <Button key={s} icon={ArrowRight} onClick={() => setPendingStatus(s)}>
                {t('booking.changeStatus')}: {statusLabel(s)}
              </Button>
            ))}
            {canCancel ? (
              <Button
                variant="ghost"
                icon={CircleX}
                className="danger-text"
                onClick={() => setCancelOpen(true)}
              >
                {t('booking.cancel')}
              </Button>
            ) : null}
          </>
        }
      />

      {!moves.length && !canCancel ? <Notice>{t('booking.noStatusChanges')}</Notice> : null}

      <div className="grid grid--main-side">
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('booking.schedule')}>
            <KeyValues
              items={[
                [
                  t('booking.schedule'),
                  `${f.date(b.scheduledStart, 'full')} · ${f.timeRange(b.scheduledStart, b.scheduledEnd)}`,
                ],
                [
                  t('booking.address'),
                  `${addressTitle(b.address, locale)} — ${f.address(b.address, 'full')}`,
                ],
                [t('booking.notes'), b.customerNotes ?? '—'],
                [t('booking.service'), `${f.text(b.service.name)} · ${f.text(b.category.name)}`],
              ]}
            />
          </Card>

          <Card
            title={t('booking.price')}
            actions={<Badge tone="info">{t('common.simulated')}</Badge>}
          >
            <ul className="list">
              {b.price.items.map((item, i) => (
                <li key={i}>
                  <span style={{ flex: 1 }}>
                    {f.text(item.label)}
                    {item.quantity > 1 ? <span className="muted"> × {item.quantity}</span> : null}
                  </span>
                  <span className="num">{f.money(item.total)}</span>
                </li>
              ))}
              <li>
                <span style={{ flex: 1 }} className="secondary">
                  {t('booking.subtotal')}
                </span>
                <span className="num">{f.money(b.price.subtotal)}</span>
              </li>
              <li>
                <span style={{ flex: 1 }} className="secondary">
                  {t('booking.visitFee')}
                </span>
                <span className="num">{f.money(b.price.visitFee)}</span>
              </li>
              {b.price.discount ? (
                <li>
                  <span style={{ flex: 1 }} className="secondary">
                    {t('booking.discount')}{' '}
                    {b.price.couponCode ? (
                      <span className="ltr">({b.price.couponCode})</span>
                    ) : null}
                  </span>
                  <span className="num success-text">−{f.money(b.price.discount)}</span>
                </li>
              ) : null}
              <li>
                <span style={{ flex: 1 }} className="strong">
                  {t('booking.total')}
                </span>
                <span className="num strong">{f.money(b.price.total)}</span>
              </li>
            </ul>
          </Card>

          <Card title={t('booking.extras')}>
            {b.extraCharges.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {t('booking.noExtras')}
              </p>
            ) : (
              <ul className="list">
                {b.extraCharges.map((x) => (
                  <li key={x.id}>
                    <span style={{ flex: 1 }}>{x.description}</span>
                    <span className="num">{f.money(x.amount)}</span>
                    <Badge
                      tone={
                        x.status === 'approved'
                          ? 'success'
                          : x.status === 'declined'
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {t(`booking.extraStatus.${x.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(b.workNotes?.length ?? 0) + (b.workPhotos?.length ?? 0) > 0 ? (
            <Card title={t('booking.workNotes')}>
              <div className="stack">
                {(b.workNotes ?? []).map((n) => (
                  <div key={n.id}>
                    <div>{n.text}</div>
                    <div className="cell-sub">
                      {f.date(n.createdAt, 'dayMonth')} · {f.time(n.createdAt)}
                    </div>
                  </div>
                ))}
                {b.workPhotos?.length ? (
                  <>
                    <span className="overline">{t('booking.photos')}</span>
                    <div className="row row--wrap">
                      {b.workPhotos.map((p) => (
                        <img
                          key={p.id}
                          className="thumb"
                          style={{ width: 88, height: 88 }}
                          src={mediaUrl(p.media)}
                          alt=""
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card title={t('booking.timeline')}>
            <ol className="timeline">
              {b.timeline.map((e, i) => (
                <li key={i}>
                  <div className="strong">{t(`booking.events.${e.type}`)}</div>
                  <div className="cell-sub">
                    {f.date(e.at, 'dayMonth')} · {f.time(e.at)} · {t(`common.actors.${e.actor}`)}
                  </div>
                  {e.note && e.type !== 'rescheduled' ? (
                    <div className="small secondary">{e.note}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <Card
            title={t('booking.customer')}
            actions={
              <Link to={`/customers/${b.customer.id}`} className="btn btn--ghost btn--sm">
                {t('booking.openCustomer')}
              </Link>
            }
          >
            <div className="row">
              <Avatar name={b.customer.fullName} />
              <div>
                <div className="strong">{b.customer.fullName}</div>
                <div className="cell-sub ltr">{f.phone(b.customer.phone)}</div>
              </div>
            </div>
          </Card>

          <Card
            title={t('booking.professional')}
            actions={
              b.technician ? (
                <Link to={`/technicians/${b.technician.id}`} className="btn btn--ghost btn--sm">
                  {t('booking.openTechnician')}
                </Link>
              ) : undefined
            }
          >
            {b.technician ? (
              <div className="row">
                <Avatar name={b.technician.fullName.en} />
                <div>
                  <div className="strong">{f.text(b.technician.fullName)}</div>
                  <div className="cell-sub">
                    {b.technician.vendorName
                      ? f.text(b.technician.vendorName)
                      : f.text(b.technician.headline)}
                  </div>
                </div>
              </div>
            ) : (
              <Notice tone="warning">{t('booking.unassigned')}</Notice>
            )}
          </Card>

          <Card title={t('booking.payment')}>
            <KeyValues
              items={[
                [t('booking.method'), f.text(paymentMethodLabels[b.payment.method])],
                [t('common.status'), f.text(paymentStatusLabels[b.payment.status])],
                [t('booking.paid'), f.money(b.payment.paidAmount)],
                [t('booking.refunded'), f.money(b.payment.refundedAmount)],
                [t('booking.due'), f.money(b.balanceDue)],
              ]}
            />
            <p className="small muted" style={{ marginBottom: 0 }}>
              {t('booking.simulatedPayment')}
            </p>
          </Card>

          {b.cancellation ? (
            <Card title={t('booking.cancellation')}>
              <KeyValues
                items={[
                  [
                    t('common.status'),
                    t('booking.cancelledBy', {
                      by: t(`common.actors.${b.cancellation.by}`),
                      date: f.date(b.cancellation.at, 'medium'),
                    }),
                  ],
                  [t('booking.reason'), b.cancellation.reason],
                  [t('booking.fee'), f.money(b.cancellation.fee)],
                  [t('booking.refund'), f.money(b.cancellation.refundAmount)],
                ]}
              />
            </Card>
          ) : null}

          <Card title={t('booking.review')}>
            {b.review ? (
              <div className="stack" style={{ gap: 6 }}>
                <div className="row" aria-label={t('common.stars', { count: b.review.rating })}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={15}
                      aria-hidden
                      fill={n <= b.review!.rating ? 'var(--accent)' : 'none'}
                      color="var(--accent)"
                    />
                  ))}
                  <Badge
                    tone={
                      b.review.status === 'published'
                        ? 'success'
                        : b.review.status === 'flagged'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {t(`reviews.${b.review.status}`)}
                  </Badge>
                </div>
                {b.review.comment ? <p style={{ margin: 0 }}>{b.review.comment}</p> : null}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('booking.noReview')}
              </p>
            )}
          </Card>

          <Card title={t('booking.tickets')}>
            {tickets.data?.length ? (
              <ul className="list">
                {tickets.data.map((ticket) => (
                  <li key={ticket.id}>
                    <Link to={`/tickets/${ticket.id}`} className="strong ltr">
                      {ticket.reference}
                    </Link>
                    <span className="truncate" style={{ flex: 1 }}>
                      {ticket.subject}
                    </span>
                    <Badge>{t(`tickets.${ticket.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('booking.noTickets')}
              </p>
            )}
          </Card>
        </div>
      </div>

      {assignOpen ? (
        <AssignDialog
          bookingId={b.id}
          currentId={b.technician?.id ?? null}
          category={f.text(b.category.name)}
          area={area ? f.text(area.name) : f.address(b.address, 'short')}
          time={`${f.date(b.scheduledStart, 'dayMonth')} ${f.timeRange(b.scheduledStart, b.scheduledEnd)}`}
          onClose={() => setAssignOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={pendingStatus !== null}
        title={
          pendingStatus ? t('booking.statusTitle', { status: statusLabel(pendingStatus) }) : ''
        }
        body={t('booking.statusBody')}
        confirmLabel={t('common.confirm')}
        loading={updateStatus.isPending}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => pendingStatus && changeStatus(pendingStatus)}
      />

      <ConfirmDialog
        open={cancelOpen}
        title={t('booking.cancelTitle', { reference: b.reference })}
        body={t('booking.cancelBody')}
        confirmLabel={t('booking.cancel')}
        destructive
        loading={updateStatus.isPending}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => changeStatus('cancelled', reason.trim() || undefined)}
      >
        <Field label={t('booking.cancelReason')}>
          {(props) => (
            <Textarea
              {...props}
              value={reason}
              maxLength={200}
              placeholder={t('booking.cancelReasonPlaceholder')}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
      </ConfirmDialog>
    </div>
  );
}

function AssignDialog({
  bookingId,
  currentId,
  category,
  area,
  time,
  onClose,
}: {
  bookingId: string;
  currentId: string | null;
  category: string;
  area: string;
  time: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const eligible = useEligibleTechnicians(bookingId);
  const assign = useAssignTechnician();
  const [selected, setSelected] = useState<string | null>(null);
  const choice = eligible.data?.find((e) => e.technician.id === selected);

  return (
    <Dialog open title={t('booking.assignTitle')} onClose={onClose} wide>
      <p className="secondary" style={{ margin: 0 }}>
        {t('booking.assignBody', { category, area, time })}
      </p>
      {eligible.isPending ? (
        <LoadingRows rows={4} />
      ) : eligible.isError ? (
        <ErrorState onRetry={() => void eligible.refetch()} />
      ) : eligible.data.length === 0 ? (
        <EmptyState title={t('booking.noEligible')} />
      ) : (
        <div
          role="radiogroup"
          aria-label={t('booking.assignTitle')}
          className="stack"
          style={{ gap: 8 }}
        >
          {eligible.data.map((e) => {
            const isCurrent = e.technician.id === currentId;
            const disabled = !e.isFree || isCurrent;
            return (
              <label
                key={e.technician.id}
                className="card row"
                style={{
                  padding: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled && !isCurrent ? 0.55 : 1,
                  borderColor: selected === e.technician.id ? 'var(--accent)' : undefined,
                }}
              >
                <input
                  type="radio"
                  name="technician"
                  value={e.technician.id}
                  disabled={disabled}
                  checked={selected === e.technician.id}
                  onChange={() => setSelected(e.technician.id)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="avatar" aria-hidden>
                  {e.technician.fullName.en
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <span className="truncate" style={{ flex: 1 }}>
                  <span className="strong">{f.text(e.technician.fullName)}</span>
                  <span className="cell-sub" style={{ display: 'block' }}>
                    {e.technician.vendorName
                      ? f.text(e.technician.vendorName)
                      : f.text(e.technician.headline)}{' '}
                    · {f.rating(e.technician.rating)}
                  </span>
                </span>
                {isCurrent ? <Badge tone="accent">{t('booking.current')}</Badge> : null}
                {!e.isOnline ? <Badge>{t('booking.offline')}</Badge> : null}
                <Badge tone={e.isFree ? 'success' : 'danger'}>
                  {e.isFree ? t('booking.free') : t('booking.busy')}
                </Badge>
              </label>
            );
          })}
        </div>
      )}
      <div className="dialog__actions">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          disabled={!choice}
          loading={assign.isPending}
          onClick={() =>
            choice &&
            assign.mutate(
              { bookingId, technicianId: choice.technician.id },
              {
                onSuccess: () => {
                  show(t('booking.assigned', { name: f.text(choice.technician.fullName) }));
                  onClose();
                },
                onError: (e) => show(errorMessage(e), 'error'),
              },
            )
          }
        >
          {t('booking.assignAction')}
        </Button>
      </div>
    </Dialog>
  );
}
