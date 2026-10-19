import { isApiError, type TicketStatus, ticketStatusTone } from '@myhome/shared';
import { SearchX, Send } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  KeyValues,
  LoadingRows,
  Notice,
  Select,
  Textarea,
} from '@/components/ui';
import { useReplyToTicket, useSetTicketStatus, useTicket } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { priorityTone, TICKET_STATUSES } from './TicketsPage';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const ticket = useTicket(id);
  const reply = useReplyToTicket();
  const setStatus = useSetTicketStatus();
  const [text, setText] = useState('');
  const crumbs = [
    { label: t('nav.dashboard'), to: '/' },
    { label: t('tickets.title'), to: '/tickets' },
  ];

  if (ticket.isPending) {
    return (
      <div className="page">
        <PageHeader title={t('common.loading')} crumbs={crumbs} />
        <Card>
          <LoadingRows />
        </Card>
      </div>
    );
  }
  if (ticket.isError) {
    return (
      <div className="page">
        <PageHeader title={t('tickets.title')} crumbs={crumbs} />
        <Card>
          {isApiError(ticket.error) && ticket.error.code === 'NOT_FOUND' ? (
            <EmptyState
              icon={SearchX}
              title={t('common.notFound')}
              body={t('common.notFoundBody')}
            />
          ) : (
            <ErrorState onRetry={() => void ticket.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const tk = ticket.data;
  const closed = tk.status === 'closed';

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    reply.mutate(
      { id: tk.id, text },
      {
        onSuccess: () => {
          setText('');
          show(t('tickets.replied'));
        },
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );
  };

  const changeStatus = (status: TicketStatus) =>
    setStatus.mutate(
      { id: tk.id, status },
      {
        onSuccess: () => show(t('tickets.statusChanged')),
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );

  const requesterHref =
    tk.requesterRole === 'customer'
      ? `/customers/${tk.requesterId}`
      : `/technicians/${tk.requesterId}`;

  return (
    <div className="page">
      <PageHeader
        title={tk.subject}
        subtitle={tk.reference}
        crumbs={[...crumbs, { label: tk.reference }]}
        badge={<Badge tone={ticketStatusTone[tk.status]}>{t(`tickets.${tk.status}`)}</Badge>}
      />
      <div className="grid grid--main-side">
        <Card title={t('tickets.conversation')}>
          <ol className="messages" aria-label={t('tickets.conversation')}>
            {tk.messages.map((m) => (
              <li key={m.id} className={`message${m.from === 'agent' ? ' message--agent' : ''}`}>
                <div className="small strong">
                  {m.from === 'agent' ? t('tickets.agent') : tk.requesterName}
                  <span className="muted">
                    {' '}
                    · {f.date(m.createdAt, 'dayMonth')} {f.time(m.createdAt)}
                  </span>
                </div>
                <div dir="auto" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                  {m.text}
                </div>
              </li>
            ))}
          </ol>
          {closed ? (
            <Notice>{t('tickets.closedNote')}</Notice>
          ) : (
            <form className="stack" style={{ marginTop: 16 }} onSubmit={send}>
              <Field label={t('tickets.reply')} hint={t('tickets.demoNote')}>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    dir="auto"
                    value={text}
                    placeholder={t('tickets.replyPlaceholder')}
                    onChange={(e) => setText(e.target.value)}
                  />
                )}
              </Field>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  icon={Send}
                  loading={reply.isPending}
                  disabled={!text.trim()}
                >
                  {t('tickets.send')}
                </Button>
              </div>
            </form>
          )}
        </Card>
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('common.status')}>
            <Field label={t('tickets.changeStatus')}>
              {(p) => (
                <Select
                  {...p}
                  value={tk.status}
                  disabled={setStatus.isPending}
                  onChange={(e) => changeStatus(e.target.value as TicketStatus)}
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`tickets.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Card>
          <Card title={t('tickets.details')}>
            <KeyValues
              items={[
                [t('tickets.requesterLabel'), <Link to={requesterHref}>{tk.requesterName}</Link>],
                [t('tickets.requester'), t(`tickets.roles.${tk.requesterRole}`)],
                [t('tickets.category'), t(`tickets.categories.${tk.category}`)],
                [
                  t('tickets.priority'),
                  <Badge tone={priorityTone[tk.priority]}>
                    {t(`tickets.priorities.${tk.priority}`)}
                  </Badge>,
                ],
                ...(tk.bookingId
                  ? [
                      [
                        t('tickets.booking'),
                        <Link to={`/bookings/${tk.bookingId}`}>{t('common.view')}</Link>,
                      ] as [string, ReactNode],
                    ]
                  : []),
                [t('tickets.opened'), f.date(tk.createdAt, 'medium')],
                [t('tickets.updated'), f.relative(tk.updatedAt)],
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
