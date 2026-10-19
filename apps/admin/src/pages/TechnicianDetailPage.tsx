import {
  type BookingView,
  documentStatusLabels,
  documentStatusTone,
  documentTypeLabels,
  isApiError,
  kuwaitDateOf,
  kuwaitLocalToISO,
  spokenLanguageLabels,
  type TechnicianStatus,
  technicianStatusLabels,
  weekdayName,
  type Weekday,
} from '@myhome/shared';
import { BadgeCheck, CircleCheck, CircleX, PauseCircle, SearchX, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Avatar,
  Badge,
  BookingStatusBadge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  KeyValues,
  LoadingRows,
  Notice,
} from '@/components/ui';
import {
  useBookings,
  useCategories,
  useGovernorates,
  useReviewDocument,
  useReviews,
  useSetTechnicianStatus,
  useTechnician,
} from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import { canApprove, needsAttention } from '@/lib/technicians';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

const WEEK: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const statusTone = { pending_approval: 'warning', active: 'success', suspended: 'danger' } as const;

export function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const now = useNow();
  const technician = useTechnician(id);
  const categories = useCategories();
  const governorates = useGovernorates();
  const upcoming = useBookings({
    technicianId: id,
    status: ['confirmed', 'on_the_way', 'arrived', 'in_progress'],
    sort: 'scheduled_asc',
    pageSize: 20,
  });
  const reviews = useReviews({ technicianId: id, pageSize: 5 });
  const setStatus = useSetTechnicianStatus();
  const reviewDocument = useReviewDocument();
  const [pending, setPending] = useState<TechnicianStatus | null>(null);
  const crumbs = [
    { label: t('nav.dashboard'), to: '/' },
    { label: t('technicians.title'), to: '/technicians' },
  ];

  if (technician.isPending) {
    return (
      <div className="page">
        <PageHeader title={t('common.loading')} crumbs={crumbs} />
        <Card>
          <LoadingRows />
        </Card>
      </div>
    );
  }
  if (technician.isError || !technician.data) {
    return (
      <div className="page">
        <PageHeader title={t('technicians.title')} crumbs={crumbs} />
        <Card>
          {isApiError(technician.error) && technician.error.code === 'NOT_FOUND' ? (
            <EmptyState icon={SearchX} title={t('common.notFound')} />
          ) : (
            <ErrorState onRetry={() => void technician.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const tech = technician.data;
  const name = f.text(tech.fullName);
  const approvable = canApprove(tech);
  const today = kuwaitDateOf(now);
  const clock = (hhmm: string) => f.time(kuwaitLocalToISO(today, hhmm));

  const confirmStatus = () =>
    pending &&
    setStatus.mutate(
      { id: tech.id, status: pending },
      {
        onSuccess: () => {
          setPending(null);
          show(t('technicians.statusChanged'));
        },
        onError: (e) => {
          setPending(null);
          show(errorMessage(e), 'error');
        },
      },
    );

  return (
    <div className="page">
      <PageHeader
        title={name}
        subtitle={f.text(tech.headline)}
        crumbs={[...crumbs, { label: name }]}
        badge={
          <Badge tone={statusTone[tech.status]}>
            {f.text(technicianStatusLabels[tech.status])}
          </Badge>
        }
        actions={
          <>
            {tech.status !== 'active' ? (
              <Button
                variant="primary"
                icon={BadgeCheck}
                disabled={!approvable}
                title={approvable ? undefined : t('technicians.approveBlocked')}
                onClick={() => setPending('active')}
              >
                {tech.status === 'suspended'
                  ? t('technicians.reactivate')
                  : t('technicians.approve')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                icon={PauseCircle}
                className="danger-text"
                onClick={() => setPending('suspended')}
              >
                {t('technicians.suspend')}
              </Button>
            )}
          </>
        }
      />
      {tech.status !== 'active' && !approvable ? (
        <Notice tone="warning">{t('technicians.approveBlocked')}</Notice>
      ) : null}

      <div className="grid grid--main-side">
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('technicians.documents')}>
            <Notice>{t('technicians.docsDemo')}</Notice>
            <ul className="list" style={{ marginTop: 8 }}>
              {tech.documents.map((doc) => (
                <li key={doc.id} style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="strong">{f.text(documentTypeLabels[doc.type])}</div>
                    <div className="cell-sub">
                      {t('technicians.uploaded', { date: f.date(doc.uploadedAt, 'medium') })}
                      {doc.expiresAt
                        ? ` · ${t('technicians.expires', { date: f.date(doc.expiresAt, 'medium') })}`
                        : ''}
                    </div>
                  </div>
                  <Badge
                    tone={
                      needsAttention(doc, now) && doc.status === 'verified'
                        ? 'warning'
                        : documentStatusTone[doc.status]
                    }
                  >
                    {f.text(documentStatusLabels[doc.status])}
                  </Badge>
                  {doc.status !== 'verified' ? (
                    <Button
                      size="sm"
                      icon={CircleCheck}
                      loading={
                        reviewDocument.isPending &&
                        reviewDocument.variables?.documentId === doc.id &&
                        reviewDocument.variables.status === 'verified'
                      }
                      onClick={() =>
                        reviewDocument.mutate(
                          { technicianId: tech.id, documentId: doc.id, status: 'verified' },
                          {
                            onSuccess: () => show(t('technicians.verifiedToast')),
                            onError: (e) => show(errorMessage(e), 'error'),
                          },
                        )
                      }
                    >
                      {t('technicians.verify')}
                    </Button>
                  ) : null}
                  {doc.status !== 'rejected' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={CircleX}
                      onClick={() =>
                        reviewDocument.mutate(
                          { technicianId: tech.id, documentId: doc.id, status: 'rejected' },
                          {
                            onSuccess: () => show(t('technicians.rejectedToast')),
                            onError: (e) => show(errorMessage(e), 'error'),
                          },
                        )
                      }
                    >
                      {t('technicians.reject')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t('technicians.upcoming')} flush>
            <DataTable<BookingView>
              caption={t('technicians.upcoming')}
              rows={upcoming.data?.items}
              loading={upcoming.isPending}
              rowKey={(b) => b.id}
              rowLabel={(b) => b.reference}
              onRowClick={(b) => navigate(`/bookings/${b.id}`)}
              empty={<EmptyState title={t('technicians.noUpcoming')} />}
              columns={[
                {
                  id: 'ref',
                  header: t('bookings.reference'),
                  cell: (b) => <span className="cell-main ltr">{b.reference}</span>,
                },
                {
                  id: 'service',
                  header: t('bookings.service'),
                  cell: (b) => f.text(b.service.name),
                },
                {
                  id: 'when',
                  header: t('bookings.schedule'),
                  cell: (b) =>
                    `${f.date(b.scheduledStart, 'dayMonth')} · ${f.timeRange(b.scheduledStart, b.scheduledEnd)}`,
                },
                {
                  id: 'status',
                  header: t('common.status'),
                  cell: (b) => <BookingStatusBadge status={b.status} />,
                },
              ]}
            />
          </Card>

          <Card title={t('technicians.reviews')}>
            {reviews.data?.items.length ? (
              <ul className="list">
                {reviews.data.items.map((r) => (
                  <li key={r.id} style={{ alignItems: 'flex-start' }}>
                    <span
                      className="row"
                      style={{ gap: 4, flex: 'none' }}
                      aria-label={t('common.stars', { count: r.rating })}
                    >
                      <Star size={14} aria-hidden fill="var(--accent)" color="var(--accent)" />
                      <span className="strong num">{r.rating}</span>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="strong">
                        {r.customerDisplayName} ·{' '}
                        <span className="secondary">{f.text(r.serviceName)}</span>
                      </div>
                      {r.comment ? <div className="secondary">{r.comment}</div> : null}
                    </div>
                    <Badge>{t(`reviews.${r.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('technicians.noReviews')}
              </p>
            )}
          </Card>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('technicians.profile')}>
            <div className="row" style={{ marginBottom: 16 }}>
              <Avatar name={tech.fullName.en} large />
              <div>
                <div className="strong">{name}</div>
                <div className="row" style={{ gap: 4 }}>
                  <Star size={13} aria-hidden fill="var(--accent)" color="var(--accent)" />
                  <span className="strong">{f.rating(tech.rating)}</span>
                  <span className="muted small">({tech.reviewsCount})</span>
                </div>
              </div>
            </div>
            <KeyValues
              items={[
                [t('customers.phone'), <span className="ltr">{f.phone(tech.phone)}</span>],
                [
                  t('technicians.company'),
                  tech.vendorId ? (
                    <Link to={`/vendors/${tech.vendorId}`}>
                      {tech.vendorName ? f.text(tech.vendorName) : tech.vendorId}
                    </Link>
                  ) : (
                    t('technicians.independent')
                  ),
                ],
                [
                  t('technicians.presence'),
                  tech.isOnline ? t('technicians.online') : t('technicians.offline'),
                ],
                [t('technicians.jobs'), tech.jobsCompleted],
                [t('technicians.joined'), f.date(tech.joinedAt, 'medium')],
                [
                  t('technicians.experienceLabel'),
                  t('technicians.experience', { count: tech.yearsExperience }),
                ],
              ]}
            />
            <p className="secondary small">{f.text(tech.bio)}</p>
          </Card>
          <Card title={t('technicians.skills')}>
            <div className="tags">
              {tech.categoryIds.map((cid) => {
                const c = categories.data?.find((x) => x.id === cid);
                return c ? (
                  <span key={cid} className="tag">
                    {f.text(c.name)}
                  </span>
                ) : null;
              })}
            </div>
            <div className="overline" style={{ marginTop: 16, marginBottom: 8 }}>
              {t('technicians.areas')}
            </div>
            <div className="tags">
              {tech.governorateIds.map((gid) => {
                const g = governorates.data?.find((x) => x.id === gid);
                return g ? (
                  <span key={gid} className="tag">
                    {f.text(g.name)}
                  </span>
                ) : null;
              })}
            </div>
            <div className="overline" style={{ marginTop: 16, marginBottom: 8 }}>
              {t('technicians.languages')}
            </div>
            <div className="tags">
              {tech.languages.map((l) => (
                <span key={l} className="tag">
                  {f.text(spokenLanguageLabels[l])}
                </span>
              ))}
            </div>
          </Card>
          <Card title={t('technicians.hours')}>
            <ul className="list">
              {WEEK.map((day) => {
                const hours = tech.availability.weekly[day];
                return (
                  <li key={day}>
                    <span style={{ flex: 1 }}>{weekdayName(day, locale)}</span>
                    <span className={hours ? 'strong num' : 'muted'}>
                      {hours ? `${clock(hours.start)} – ${clock(hours.end)}` : t('technicians.off')}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="overline" style={{ marginTop: 12, marginBottom: 6 }}>
              {t('technicians.daysOff')}
            </div>
            {tech.availability.daysOff.length ? (
              <div className="tags">
                {tech.availability.daysOff.map((d) => (
                  <span key={d} className="tag">
                    {f.date(kuwaitLocalToISO(d, '12:00'), 'medium')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                {t('technicians.noDaysOff')}
              </p>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={
          pending === 'suspended'
            ? t('technicians.suspendTitle', { name })
            : t('technicians.approveTitle', { name })
        }
        body={pending === 'suspended' ? t('technicians.suspendBody') : t('technicians.approveBody')}
        confirmLabel={pending === 'suspended' ? t('technicians.suspend') : t('common.confirm')}
        destructive={pending === 'suspended'}
        loading={setStatus.isPending}
        onCancel={() => setPending(null)}
        onConfirm={confirmStatus}
      />
    </div>
  );
}
