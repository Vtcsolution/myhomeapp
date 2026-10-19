import {
  type BookingSort,
  type BookingStatus,
  bookingStatusLabels,
  type BookingView,
} from '@myhome/shared';
import { CalendarSearch, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataTable, Pagination } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Badge,
  BookingStatusBadge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
} from '@/components/ui';
import { useBookings, useCategories, useTechnicians } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import type { TKey } from '@/i18n';
import {
  BOOKING_STATUSES,
  type BookingFilters,
  emptyFilters,
  hasActiveFilters,
  parseBookingFilters,
  toBookingQuery,
  toSearchParams,
} from '@/lib/bookingQuery';
import { useLocale } from '@/providers/LocaleProvider';
import { readPreferences } from '@/services/preferences';

const SORT_LABEL: Record<BookingSort, TKey> = {
  scheduled_desc: 'bookings.sortScheduledDesc',
  scheduled_asc: 'bookings.sortScheduledAsc',
  created_desc: 'bookings.sortCreated',
  total_desc: 'bookings.sortTotal',
};

export function BookingsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = parseBookingFilters(params);
  const pageSize = readPreferences().pageSize;
  const bookings = useBookings(toBookingQuery(filters, pageSize));
  const categories = useCategories();
  const technicians = useTechnicians({ pageSize: 100 });
  // The search box follows the URL when it changes elsewhere (e.g. the top-bar search).
  const [searchState, setSearchState] = useState({ value: filters.q, synced: filters.q });
  if (searchState.synced !== filters.q) setSearchState({ value: filters.q, synced: filters.q });
  const search = searchState.value;
  const setSearch = (value: string) => setSearchState((s) => ({ ...s, value }));

  const update = (patch: Partial<BookingFilters>) =>
    setParams(toSearchParams({ ...filters, page: 1, ...patch }), { replace: true });

  const statusValue =
    filters.status.length === 1 ? filters.status[0]! : filters.status.length ? 'multi' : '';

  return (
    <div className="page">
      <PageHeader
        title={t('bookings.title')}
        subtitle={t('bookings.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('bookings.title') }]}
      />

      <Card>
        <form
          className="filters"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <Field label={t('bookings.search')} className="field--search">
            {(props) => (
              <div className="input-icon">
                <Search size={16} aria-hidden />
                <Input
                  {...props}
                  type="search"
                  value={search}
                  placeholder={t('bookings.searchPlaceholder')}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => search.trim() !== filters.q && update({ q: search.trim() })}
                />
              </div>
            )}
          </Field>
          <Field label={t('bookings.status')}>
            {(props) => (
              <Select
                {...props}
                value={statusValue}
                onChange={(e) =>
                  update({ status: e.target.value ? [e.target.value as BookingStatus] : [] })
                }
              >
                <option value="">{t('bookings.any')}</option>
                {statusValue === 'multi' ? (
                  <option value="multi" disabled>
                    {filters.status.map((s) => f.text(bookingStatusLabels[s])).join(' + ')}
                  </option>
                ) : null}
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {f.text(bookingStatusLabels[s])}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('bookings.category')}>
            {(props) => (
              <Select
                {...props}
                value={filters.categoryId}
                onChange={(e) => update({ categoryId: e.target.value })}
              >
                <option value="">{t('bookings.any')}</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {f.text(c.name)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('bookings.technician')}>
            {(props) => (
              <Select
                {...props}
                value={filters.technicianId}
                onChange={(e) => update({ technicianId: e.target.value })}
              >
                <option value="">{t('bookings.any')}</option>
                {(technicians.data?.items ?? []).map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {f.text(tech.fullName)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('bookings.from')}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('bookings.to')}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('bookings.sort')}>
            {(props) => (
              <Select
                {...props}
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as BookingSort })}
              >
                {(Object.keys(SORT_LABEL) as BookingSort[]).map((s) => (
                  <option key={s} value={s}>
                    {t(SORT_LABEL[s])}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {hasActiveFilters(filters) ? (
            <Button
              variant="ghost"
              icon={X}
              onClick={() => setParams(toSearchParams(emptyFilters))}
            >
              {t('bookings.clearFilters')}
            </Button>
          ) : null}
        </form>
      </Card>

      <Card
        flush
        title={
          <span className="secondary strong" aria-live="polite">
            {bookings.data
              ? t('bookings.count', { count: bookings.data.total })
              : t('common.loading')}
          </span>
        }
      >
        {bookings.isError ? (
          <ErrorState onRetry={() => void bookings.refetch()} />
        ) : (
          <>
            <DataTable<BookingView>
              caption={t('bookings.title')}
              rows={bookings.data?.items}
              loading={bookings.isFetching}
              rowKey={(b) => b.id}
              rowLabel={(b) => `${b.reference}, ${b.customer.fullName}, ${f.text(b.service.name)}`}
              onRowClick={(b) => navigate(`/bookings/${b.id}`)}
              empty={
                <EmptyState
                  icon={CalendarSearch}
                  title={t('bookings.emptyTitle')}
                  body={t('bookings.emptyBody')}
                  action={
                    hasActiveFilters(filters) ? (
                      <Button onClick={() => setParams(toSearchParams(emptyFilters))}>
                        {t('bookings.clearFilters')}
                      </Button>
                    ) : undefined
                  }
                />
              }
              columns={[
                {
                  id: 'ref',
                  header: t('bookings.reference'),
                  cell: (b) => (
                    <>
                      <div className="cell-main ltr">{b.reference}</div>
                      <div className="cell-sub">{f.date(b.createdAt, 'dayMonth')}</div>
                    </>
                  ),
                },
                {
                  id: 'customer',
                  header: t('bookings.customer'),
                  cell: (b) => (
                    <>
                      <div className="strong">{b.customer.fullName}</div>
                      <div className="cell-sub ltr">{f.phone(b.customer.phone)}</div>
                    </>
                  ),
                },
                {
                  id: 'service',
                  header: t('bookings.service'),
                  hideOnSmall: true,
                  cell: (b) => (
                    <>
                      <div>{f.text(b.service.name)}</div>
                      <div className="cell-sub">{f.text(b.category.name)}</div>
                    </>
                  ),
                },
                {
                  id: 'tech',
                  header: t('bookings.technician'),
                  hideOnSmall: true,
                  cell: (b) =>
                    b.technician ? (
                      f.text(b.technician.fullName)
                    ) : (
                      <Badge tone="warning">{t('bookings.unassigned')}</Badge>
                    ),
                },
                {
                  id: 'when',
                  header: t('bookings.schedule'),
                  cell: (b) => (
                    <>
                      <div>{f.date(b.scheduledStart, 'dayMonth')}</div>
                      <div className="cell-sub">
                        {f.timeRange(b.scheduledStart, b.scheduledEnd)}
                      </div>
                    </>
                  ),
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
            {bookings.data ? (
              <Pagination
                page={bookings.data.page}
                pageSize={bookings.data.pageSize}
                total={bookings.data.total}
                onPage={(page) => setParams(toSearchParams({ ...filters, page }))}
              />
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
