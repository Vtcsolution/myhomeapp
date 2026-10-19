import { addressTitle, type BookingView, isApiError, membershipLabels } from '@myhome/shared';
import { Ban, CircleCheck, SearchX, ShieldAlert, Star } from 'lucide-react';
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
  useCustomer,
  useReviews,
  useSetCustomerStatus,
  useTickets,
} from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const customer = useCustomer(id);
  const bookings = useBookings({ customerId: id, pageSize: 100, sort: 'scheduled_desc' });
  const reviews = useReviews({ customerId: id, pageSize: 50 });
  const tickets = useTickets({ requesterId: id });
  const setStatus = useSetCustomerStatus();
  const [confirm, setConfirm] = useState(false);
  const crumbs = [
    { label: t('nav.dashboard'), to: '/' },
    { label: t('customers.title'), to: '/customers' },
  ];

  if (customer.isPending) {
    return (
      <div className="page">
        <PageHeader title={t('common.loading')} crumbs={crumbs} />
        <Card>
          <LoadingRows />
        </Card>
      </div>
    );
  }
  if (customer.isError || !customer.data) {
    return (
      <div className="page">
        <PageHeader title={t('customers.title')} crumbs={crumbs} />
        <Card>
          {isApiError(customer.error) && customer.error.code === 'NOT_FOUND' ? (
            <EmptyState icon={SearchX} title={t('common.notFound')} />
          ) : (
            <ErrorState onRetry={() => void customer.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const c = customer.data;
  const blocked = c.status === 'blocked';
  // Tickets are shared between roles; only this customer's requests count here.
  const ownTickets = (tickets.data ?? []).filter((tk) => tk.requesterRole === 'customer');

  return (
    <div className="page">
      <PageHeader
        title={c.fullName || '—'}
        crumbs={[...crumbs, { label: c.fullName || c.id }]}
        badge={
          blocked ? (
            <Badge tone="danger">{t('customers.blocked')}</Badge>
          ) : (
            <Badge tone="success">{t('customers.active')}</Badge>
          )
        }
        actions={
          <Button
            variant={blocked ? 'primary' : 'ghost'}
            icon={blocked ? CircleCheck : Ban}
            className={blocked ? undefined : 'danger-text'}
            onClick={() => setConfirm(true)}
          >
            {blocked ? t('customers.unblock') : t('customers.block')}
          </Button>
        }
      />

      <div className="grid grid--main-side">
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('customers.history')} flush>
            <DataTable<BookingView>
              caption={t('customers.history')}
              rows={bookings.data?.items}
              loading={bookings.isPending}
              rowKey={(b) => b.id}
              rowLabel={(b) => b.reference}
              onRowClick={(b) => navigate(`/bookings/${b.id}`)}
              empty={<EmptyState title={t('customers.noHistory')} />}
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
                  hideOnSmall: true,
                  cell: (b) => f.date(b.scheduledStart, 'medium'),
                },
                {
                  id: 'amount',
                  header: t('bookings.amount'),
                  align: 'end',
                  cell: (b) => f.money(b.price.total),
                },
                {
                  id: 'status',
                  header: t('common.status'),
                  cell: (b) => <BookingStatusBadge status={b.status} />,
                },
              ]}
            />
          </Card>

          <Card title={t('customers.reviews')}>
            {reviews.data?.items.length ? (
              <ul className="list">
                {reviews.data.items.map((r) => (
                  <li key={r.id} style={{ alignItems: 'flex-start' }}>
                    <div
                      className="row"
                      style={{ flex: 'none' }}
                      aria-label={t('common.stars', { count: r.rating })}
                    >
                      <Star size={14} aria-hidden fill="var(--accent)" color="var(--accent)" />
                      <span className="strong num">{r.rating}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="strong">
                        {f.text(r.serviceName)} · {f.text(r.technicianName)}
                      </div>
                      {r.comment ? <div className="secondary">{r.comment}</div> : null}
                    </div>
                    <Badge>{t(`reviews.${r.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('customers.noReviews')}
              </p>
            )}
          </Card>

          <Card title={t('customers.tickets')}>
            {ownTickets.length ? (
              <ul className="list">
                {ownTickets.map((tk) => (
                  <li key={tk.id}>
                    <Link to={`/tickets/${tk.id}`} className="strong ltr">
                      {tk.reference}
                    </Link>
                    <span className="truncate" style={{ flex: 1 }}>
                      {tk.subject}
                    </span>
                    <Badge>{t(`tickets.${tk.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('customers.noTickets')}
              </p>
            )}
          </Card>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('customers.account')}>
            <div className="row" style={{ marginBottom: 16 }}>
              <Avatar name={c.fullName || '—'} large />
              <div>
                <div className="strong">{c.fullName}</div>
                <Badge tone="accent">{f.text(membershipLabels[c.membership])}</Badge>
              </div>
            </div>
            <KeyValues
              items={[
                [t('customers.phone'), <span className="ltr">{f.phone(c.phone)}</span>],
                [t('customers.email'), c.email ? <span className="ltr">{c.email}</span> : '—'],
                [t('customers.joined'), f.date(c.createdAt, 'medium')],
                [t('customers.bookings'), c.bookingsCount],
                [t('customers.spent'), f.money(c.totalSpent)],
                [t('customers.wallet'), f.money(c.walletBalance)],
              ]}
            />
          </Card>
          <Notice icon={ShieldAlert}>{t('customers.privacy')}</Notice>
          <Card title={t('customers.addresses')}>
            {c.addresses.length ? (
              <ul className="list">
                {c.addresses.map((a) => (
                  <li key={a.id} style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="strong">
                        {addressTitle(a, locale)}{' '}
                        {a.isDefault ? (
                          <Badge tone="accent">{t('customers.defaultAddress')}</Badge>
                        ) : null}
                      </div>
                      <div className="secondary small">{f.address(a, 'full')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('customers.noAddresses')}
              </p>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={
          blocked
            ? t('customers.unblockTitle', { name: c.fullName })
            : t('customers.blockTitle', { name: c.fullName })
        }
        body={blocked ? t('customers.unblockBody') : t('customers.blockBody')}
        confirmLabel={blocked ? t('customers.unblock') : t('customers.block')}
        destructive={!blocked}
        loading={setStatus.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          setStatus.mutate(
            { id: c.id, status: blocked ? 'active' : 'blocked' },
            {
              onSuccess: () => {
                setConfirm(false);
                show(blocked ? t('customers.unblockedToast') : t('customers.blockedToast'));
              },
              onError: (e) => show(errorMessage(e), 'error'),
            },
          )
        }
      />
    </div>
  );
}
