import { type TicketRow, type TicketStatus, ticketStatusTone } from '@myhome/shared';
import { LifeBuoy } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState, ErrorState, Field, Select } from '@/components/ui';
import { useTickets } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';

export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
export const priorityTone = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
} as const;

export function TicketsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (TICKET_STATUSES as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as TicketStatus)
    : undefined;
  const role =
    params.get('role') === 'customer' || params.get('role') === 'technician'
      ? params.get('role')
      : '';
  // "Unresolved" (open or in progress) matches the sidebar count and the alert.
  const unresolved = params.get('status') === 'unresolved';
  const tickets = useTickets(status ? { status } : {});
  const rows = tickets.data
    ?.filter((tk) => !unresolved || tk.status === 'open' || tk.status === 'in_progress')
    .filter((tk) => (role ? tk.requesterRole === role : true));

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="page">
      <PageHeader
        title={t('tickets.title')}
        subtitle={t('tickets.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('tickets.title') }]}
      />
      <Card>
        <div className="filters">
          <Field label={t('common.status')}>
            {(props) => (
              <Select
                {...props}
                value={unresolved ? 'unresolved' : (status ?? '')}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="">{t('bookings.any')}</option>
                <option value="unresolved">{t('tickets.unresolved')}</option>
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`tickets.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('tickets.requester')}>
            {(props) => (
              <Select {...props} value={role ?? ''} onChange={(e) => set('role', e.target.value)}>
                <option value="">{t('bookings.any')}</option>
                <option value="customer">{t('tickets.roles.customer')}</option>
                <option value="technician">{t('tickets.roles.technician')}</option>
              </Select>
            )}
          </Field>
        </div>
      </Card>
      <Card flush>
        {tickets.isError ? (
          <ErrorState onRetry={() => void tickets.refetch()} />
        ) : (
          <DataTable<TicketRow>
            caption={t('tickets.title')}
            rows={rows}
            loading={tickets.isPending}
            rowKey={(tk) => tk.id}
            rowLabel={(tk) => `${tk.reference} ${tk.subject}`}
            onRowClick={(tk) => navigate(`/tickets/${tk.id}`)}
            empty={<EmptyState icon={LifeBuoy} title={t('tickets.emptyTitle')} />}
            columns={[
              {
                id: 'subject',
                header: t('tickets.subject'),
                cell: (tk) => (
                  <>
                    <div className="cell-main" dir="auto">
                      {tk.subject}
                    </div>
                    <div className="cell-sub ltr">{tk.reference}</div>
                  </>
                ),
              },
              {
                id: 'requester',
                header: t('tickets.requester'),
                cell: (tk) => (
                  <>
                    <div>{tk.requesterName}</div>
                    <div className="cell-sub">{t(`tickets.roles.${tk.requesterRole}`)}</div>
                  </>
                ),
              },
              {
                id: 'category',
                header: t('tickets.category'),
                hideOnSmall: true,
                cell: (tk) => t(`tickets.categories.${tk.category}`),
              },
              {
                id: 'priority',
                header: t('tickets.priority'),
                hideOnSmall: true,
                cell: (tk) => (
                  <Badge tone={priorityTone[tk.priority]}>
                    {t(`tickets.priorities.${tk.priority}`)}
                  </Badge>
                ),
              },
              {
                id: 'status',
                header: t('common.status'),
                cell: (tk) => (
                  <Badge tone={ticketStatusTone[tk.status]}>{t(`tickets.${tk.status}`)}</Badge>
                ),
              },
              {
                id: 'updated',
                header: t('tickets.updated'),
                align: 'end',
                hideOnSmall: true,
                cell: (tk) => f.relative(tk.updatedAt),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
