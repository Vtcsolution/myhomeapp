import { type PayoutRow, type PayoutStatus, toMs } from '@myhome/shared';
import { Banknote, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DataTable, Pagination } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  ErrorState,
  Field,
  Notice,
  Segmented,
  Select,
} from '@/components/ui';
import { useMarkPayoutPaid, usePayouts } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import { paginate } from '@/lib/sort';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { readPreferences } from '@/services/preferences';

type View = 'all' | 'due' | 'upcoming' | 'paid';
const VIEWS: View[] = ['all', 'due', 'upcoming', 'paid'];
const tone = { scheduled: 'info', processing: 'warning', paid: 'success' } as const;

/** A payout can be paid once its period has ended and it is not paid yet (same rule as the API). */
export const isPayoutDue = (p: PayoutRow, now: number) =>
  p.status !== 'paid' && toMs(p.periodEnd) <= now;

export function PayoutsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const now = useNow();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const [params, setParams] = useSearchParams();
  const view = (VIEWS as string[]).includes(params.get('view') ?? '')
    ? (params.get('view') as View)
    : 'all';
  const payeeType =
    params.get('type') === 'vendor' || params.get('type') === 'technician'
      ? (params.get('type') as PayoutRow['payeeType'])
      : undefined;
  const payouts = usePayouts(payeeType ? { payeeType } : {});
  const markPaid = useMarkPayoutPaid();
  const [paying, setPaying] = useState<PayoutRow | null>(null);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const all = payouts.data ?? [];
  const due = all.filter((p) => isPayoutDue(p, now));
  const upcoming = all.filter((p) => p.status !== 'paid' && !isPayoutDue(p, now));
  const paid = all.filter((p) => p.status === 'paid');
  const pageSize = readPreferences().pageSize;
  const page = paginate(
    { all, due, upcoming, paid }[view],
    Number(params.get('page')) || 1,
    pageSize,
  );
  const rows = payouts.data ? page.items : undefined;
  const sum = (list: PayoutRow[]) => list.reduce((s, p) => s + p.netAmount, 0);
  const statusLabel = (p: PayoutRow) =>
    isPayoutDue(p, now) ? t('payouts.due') : t(`payouts.${p.status satisfies PayoutStatus}`);

  return (
    <div className="page">
      <PageHeader
        title={t('payouts.title')}
        subtitle={t('payouts.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('payouts.title') }]}
      />
      <Notice tone="warning">{t('payouts.demoNote')}</Notice>
      <div className="grid grid--3">
        {(
          [
            ['due', t('payouts.due'), due],
            ['upcoming', t('payouts.upcoming'), upcoming],
            ['paid', t('payouts.paidTotal'), paid],
          ] as const
        ).map(([key, label, list]) => (
          <div key={key} className="card kpi">
            <div className="row row--between">
              <span className="overline">{label}</span>
              <DemoTag />
            </div>
            <span className="kpi__value num">{f.money(sum(list), { compact: true })}</span>
            <span className="kpi__meta">{t('payouts.payoutsCount', { count: list.length })}</span>
          </div>
        ))}
      </div>
      <Card>
        <div className="filters">
          <div className="field field--auto">
            <span className="field__label">{t('payouts.view')}</span>
            <Segmented
              label={t('payouts.view')}
              value={view}
              onChange={(v) => set('view', v)}
              options={VIEWS.map((v) => ({
                value: v,
                label:
                  v === 'all'
                    ? t('common.all')
                    : v === 'paid'
                      ? t('payouts.paid')
                      : t(`payouts.${v}`),
              }))}
            />
          </div>
          <Field label={t('payouts.type')}>
            {(props) => (
              <Select
                {...props}
                value={payeeType ?? ''}
                onChange={(e) => set('type', e.target.value)}
              >
                <option value="">{t('bookings.any')}</option>
                <option value="technician">{t('payouts.technician')}</option>
                <option value="vendor">{t('payouts.vendor')}</option>
              </Select>
            )}
          </Field>
        </div>
      </Card>
      <Card flush>
        {payouts.isError ? (
          <ErrorState onRetry={() => void payouts.refetch()} />
        ) : (
          <DataTable<PayoutRow>
            caption={t('payouts.title')}
            rows={rows}
            loading={payouts.isPending}
            rowKey={(p) => p.id}
            empty={<EmptyState icon={Banknote} title={t('payouts.emptyTitle')} />}
            columns={[
              {
                id: 'payee',
                header: t('payouts.payee'),
                cell: (p) => (
                  <>
                    <Link
                      className="cell-main"
                      to={
                        p.payeeType === 'vendor'
                          ? `/vendors/${p.payeeId}`
                          : `/technicians/${p.payeeId}`
                      }
                    >
                      {f.text(p.payeeName)}
                    </Link>
                    <div className="cell-sub">
                      {p.payeeType === 'vendor' ? t('payouts.vendor') : t('payouts.technician')}
                    </div>
                  </>
                ),
              },
              {
                id: 'period',
                header: t('payouts.period'),
                cell: (p) => (
                  <span className="num">
                    {f.date(p.periodStart, 'dayMonth')} – {f.date(toMs(p.periodEnd) - 1, 'medium')}
                  </span>
                ),
              },
              {
                id: 'jobs',
                header: t('payouts.jobs'),
                align: 'end',
                hideOnSmall: true,
                cell: (p) => p.jobsCount,
              },
              {
                id: 'gross',
                header: t('payouts.gross'),
                align: 'end',
                hideOnSmall: true,
                cell: (p) => <span className="num">{f.money(p.grossAmount)}</span>,
              },
              {
                id: 'commission',
                header: t('payouts.commission'),
                align: 'end',
                hideOnSmall: true,
                cell: (p) => <span className="num">{f.money(p.commission)}</span>,
              },
              {
                id: 'net',
                header: t('payouts.net'),
                align: 'end',
                cell: (p) => <span className="num strong">{f.money(p.netAmount)}</span>,
              },
              {
                id: 'status',
                header: t('common.status'),
                cell: (p) => (
                  <>
                    <Badge tone={isPayoutDue(p, now) ? 'accent' : tone[p.status]}>
                      {statusLabel(p)}
                    </Badge>
                    {p.paidAt ? <div className="cell-sub">{f.date(p.paidAt, 'medium')}</div> : null}
                  </>
                ),
              },
              {
                id: 'action',
                header: t('payouts.action'),
                align: 'end',
                cell: (p) =>
                  p.status === 'paid' ? null : isPayoutDue(p, now) ? (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={CircleCheck}
                      onClick={() => setPaying(p)}
                    >
                      {t('payouts.markPaid')}
                    </Button>
                  ) : (
                    <span className="small muted">{t('payouts.periodOpen')}</span>
                  ),
              },
            ]}
          />
        )}
        <Pagination
          page={page.page}
          pageSize={pageSize}
          total={page.total}
          onPage={(p) => set('page', String(p))}
        />
      </Card>
      <ConfirmDialog
        open={paying !== null}
        title={paying ? t('payouts.markPaidTitle', { name: f.text(paying.payeeName) }) : ''}
        body={paying ? t('payouts.markPaidBody', { amount: f.money(paying.netAmount) }) : undefined}
        confirmLabel={t('payouts.markPaid')}
        loading={markPaid.isPending}
        onCancel={() => setPaying(null)}
        onConfirm={() =>
          paying &&
          markPaid.mutate(paying.id, {
            onSuccess: () => {
              setPaying(null);
              show(t('payouts.paidToast'));
            },
            onError: (e) => show(errorMessage(e), 'error'),
          })
        }
      />
    </div>
  );
}
