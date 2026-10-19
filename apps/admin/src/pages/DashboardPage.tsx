import {
  type BookingStatus,
  bookingStatusLabels,
  type BookingView,
  kuwaitLocalToISO,
} from '@myhome/shared';
import {
  CalendarCheck,
  CircleDollarSign,
  Clock4,
  Hourglass,
  Percent,
  Star,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { BarList, DonutChart, TimeSeriesChart } from '@/components/charts';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Avatar, BookingStatusBadge, Card, DemoTag, ErrorState, Skeleton } from '@/components/ui';
import { useDashboard } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { buildAlerts } from '@/lib/alerts';
import { formatChange, percentChange, statusColor } from '@/lib/charts';
import { useLocale } from '@/providers/LocaleProvider';
import { readPreferences } from '@/services/preferences';

const STATUS_ORDER: BookingStatus[] = [
  'pending',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
];

function Kpi({
  icon: Icon,
  label,
  value,
  meta,
  demo,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  demo?: boolean;
}) {
  return (
    <div className="card kpi">
      <div className="row row--between">
        <span className="kpi__icon">
          <Icon size={17} aria-hidden />
        </span>
        {demo ? <DemoTag /> : null}
      </div>
      <span className="overline">{label}</span>
      <span className="kpi__value">{value}</span>
      {meta ? <span className="kpi__meta">{meta}</span> : null}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const d = dashboard.data;
  const dayLabel = (date: string) => f.date(kuwaitLocalToISO(date, '12:00'), 'dayMonth');

  if (dashboard.isError) {
    return (
      <div className="page">
        <PageHeader title={t('dashboard.title')} />
        <Card>
          <ErrorState onRetry={() => void dashboard.refetch()} />
        </Card>
      </div>
    );
  }

  const alerts = d ? buildAlerts(d, readPreferences().alerts) : [];
  const k = d?.kpis;

  return (
    <div className="page">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        badge={<DemoTag />}
      />

      {d && alerts.length ? (
        <Card title={t('dashboard.attention')}>
          <ul className="list">
            {alerts.map((a) => (
              <li key={a.key}>
                <span className={`badge badge--${a.tone}`}>{a.count}</span>
                <Link to={a.href} className="strong">
                  {t(`alerts.${a.key}`, { count: a.count })}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid grid--kpi">
        {!k ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card">
              <Skeleton height={96} />
            </div>
          ))
        ) : (
          <>
            <Kpi
              icon={CalendarCheck}
              label={t('dashboard.bookingsTotal')}
              value={f.number(k.bookingsTotal)}
              meta={t('dashboard.bookingsMonth', { count: k.bookingsMonth })}
            />
            <Kpi
              icon={Clock4}
              label={t('dashboard.activeBookings')}
              value={f.number(k.activeBookings)}
              meta={t('dashboard.activeMeta')}
            />
            <Kpi
              icon={Hourglass}
              label={t('dashboard.pending')}
              value={f.number(d.byStatus.pending)}
              meta={t('dashboard.pendingMeta')}
            />
            <Kpi
              icon={TrendingUp}
              label={t('dashboard.revenueMonth')}
              value={f.money(k.revenueMonth, { compact: true })}
              meta={`${f.money(k.revenueMonth)} · ${t('dashboard.change', {
                change: formatChange(percentChange(k.revenueMonth, k.revenuePreviousMonth)),
              })}`}
              demo
            />
            <Kpi
              icon={CircleDollarSign}
              label={t('dashboard.feesMonth')}
              value={f.money(k.platformFeesMonth, { compact: true })}
              meta={`${f.money(k.platformFeesMonth)}${k.revenueMonth ? ` · ${t('dashboard.feesShare', { percent: f.percent(k.platformFeesMonth / k.revenueMonth) })}` : ''}`}
              demo
            />
            <Kpi
              icon={Users}
              label={t('dashboard.customers')}
              value={f.number(k.customers)}
              meta={t('dashboard.vendorsMeta', { count: k.vendors })}
            />
            <Kpi
              icon={Wrench}
              label={t('dashboard.technicians')}
              value={f.number(k.technicians)}
              meta={t('dashboard.techniciansMeta', {
                active: k.activeTechnicians,
                online: k.onlineTechnicians,
                busy: k.techniciansOnJob,
              })}
            />
            <Kpi
              icon={Star}
              label={t('dashboard.rating')}
              value={f.rating(k.averageRating)}
              meta={t('dashboard.ratingMeta', {
                percent: f.percent(k.satisfactionRate),
                count: k.reviewsCount,
              })}
            />
            <Kpi
              icon={Percent}
              label={t('dashboard.completion')}
              value={f.percent(k.completionRate)}
              meta={t('dashboard.completionMeta', { percent: f.percent(k.cancellationRate) })}
            />
          </>
        )}
      </div>

      <div className="grid grid--main-side">
        <Card title={t('dashboard.revenueTrend')} actions={<DemoTag />}>
          {d ? (
            <TimeSeriesChart
              caption={t('dashboard.revenueTrend')}
              points={d.revenueSeries.map((p) => ({ label: dayLabel(p.date), value: p.revenue }))}
              format={(v) => f.money(v)}
              axisFormat={(v) => f.money(v, { compact: true })}
            />
          ) : (
            <Skeleton height={220} />
          )}
        </Card>
        <Card title={t('dashboard.statusMix')}>
          {d ? (
            <DonutChart
              centerValue={f.number(k!.bookingsTotal)}
              centerLabel={t('dashboard.bookings')}
              slices={STATUS_ORDER.map((s) => ({
                label: f.text(bookingStatusLabels[s]),
                value: d.byStatus[s],
                color: statusColor(s),
              }))}
            />
          ) : (
            <Skeleton height={160} />
          )}
        </Card>
      </div>

      <div className="grid grid--2">
        <Card title={t('dashboard.bookingsTrend')}>
          {d ? (
            <TimeSeriesChart
              variant="bars"
              caption={t('dashboard.bookingsTrend')}
              points={d.revenueSeries.map((p) => ({ label: dayLabel(p.date), value: p.bookings }))}
              format={(v) => f.number(v)}
              color="var(--info)"
            />
          ) : (
            <Skeleton height={220} />
          )}
        </Card>
        <Card title={t('dashboard.categories')} actions={<DemoTag />}>
          {d ? (
            d.byCategory.every((c) => c.bookings === 0) ? (
              <p className="muted">{t('dashboard.noData')}</p>
            ) : (
              <BarList
                items={d.byCategory
                  .filter((c) => c.bookings > 0)
                  .map((c) => ({
                    label: f.text(c.name),
                    value: c.revenue,
                    display: f.money(c.revenue, { compact: true }),
                    meta: t('dashboard.jobs', { count: c.bookings }),
                  }))}
              />
            )
          ) : (
            <Skeleton height={220} />
          )}
        </Card>
      </div>

      <div className="grid grid--main-side">
        <Card
          title={t('dashboard.recent')}
          flush
          actions={
            <Link to="/bookings?sort=created_desc" className="btn btn--ghost btn--sm">
              {t('dashboard.viewAll')}
            </Link>
          }
        >
          <DataTable<BookingView>
            caption={t('dashboard.recent')}
            rows={d?.recentBookings}
            loading={dashboard.isPending}
            rowKey={(b) => b.id}
            rowLabel={(b) => `${b.reference}, ${f.text(b.service.name)}`}
            onRowClick={(b) => navigate(`/bookings/${b.id}`)}
            columns={[
              {
                id: 'ref',
                header: t('bookings.reference'),
                cell: (b) => (
                  <>
                    <div className="cell-main ltr">{b.reference}</div>
                    <div className="cell-sub">{b.customer.fullName}</div>
                  </>
                ),
              },
              {
                id: 'service',
                header: t('bookings.service'),
                hideOnSmall: true,
                cell: (b) => f.text(b.service.name),
              },
              {
                id: 'status',
                header: t('common.status'),
                cell: (b) => <BookingStatusBadge status={b.status} />,
              },
              {
                id: 'amount',
                header: t('bookings.amount'),
                align: 'end',
                cell: (b) => f.money(b.price.total),
              },
            ]}
          />
        </Card>
        <Card title={t('dashboard.topTechnicians')} actions={<DemoTag />}>
          {d ? (
            d.topTechnicians.length === 0 ? (
              <p className="muted">{t('dashboard.noData')}</p>
            ) : (
              <ul className="list">
                {d.topTechnicians.map((row) => (
                  <li key={row.technician.id}>
                    <Avatar name={row.technician.fullName.en} />
                    <div className="truncate" style={{ flex: 1 }}>
                      <Link to={`/technicians/${row.technician.id}`} className="strong truncate">
                        {f.text(row.technician.fullName)}
                      </Link>
                      <div className="cell-sub">
                        {t('dashboard.jobs', { count: row.jobs })} ·{' '}
                        <Star
                          size={12}
                          aria-hidden
                          style={{ verticalAlign: '-1px', color: 'var(--accent)' }}
                        />{' '}
                        <span aria-label={t('technicians.rating')}>
                          {f.rating(row.technician.rating)}
                        </span>
                      </div>
                    </div>
                    <span className="strong num">{f.money(row.revenue, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <Skeleton height={220} />
          )}
        </Card>
      </div>
    </div>
  );
}
