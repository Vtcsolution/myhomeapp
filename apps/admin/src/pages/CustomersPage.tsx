import { type CustomerRow, membershipLabels } from '@myhome/shared';
import { Search, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataTable, Pagination } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Avatar, Badge, Card, EmptyState, ErrorState, Field, Input } from '@/components/ui';
import { useCustomers } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { readPreferences } from '@/services/preferences';

export function CustomersPage() {
  const { t } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = readPreferences().pageSize;
  const customers = useCustomers({ search: q || undefined, page, pageSize });
  const [search, setSearch] = useState({ value: q, synced: q });
  if (search.synced !== q) setSearch({ value: q, synced: q });

  const apply = (next: { q?: string; page?: number }) => {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    if (nq) p.set('q', nq);
    if ((next.page ?? 1) > 1) p.set('page', String(next.page));
    setParams(p, { replace: true });
  };

  return (
    <div className="page">
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('customers.title') }]}
      />
      <Card>
        <form
          className="filters"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q: search.value.trim() });
          }}
        >
          <Field label={t('bookings.search')} className="field--search">
            {(props) => (
              <div className="input-icon">
                <Search size={16} aria-hidden />
                <Input
                  {...props}
                  type="search"
                  value={search.value}
                  placeholder={t('customers.searchPlaceholder')}
                  onChange={(e) => setSearch({ ...search, value: e.target.value })}
                  onBlur={() => search.value.trim() !== q && apply({ q: search.value.trim() })}
                />
              </div>
            )}
          </Field>
        </form>
      </Card>
      <Card flush>
        {customers.isError ? (
          <ErrorState onRetry={() => void customers.refetch()} />
        ) : (
          <>
            <DataTable<CustomerRow>
              caption={t('customers.title')}
              rows={customers.data?.items}
              loading={customers.isFetching}
              rowKey={(c) => c.id}
              rowLabel={(c) => c.fullName}
              onRowClick={(c) => navigate(`/customers/${c.id}`)}
              empty={<EmptyState icon={Users} title={t('customers.emptyTitle')} />}
              columns={[
                {
                  id: 'name',
                  header: t('customers.name'),
                  cell: (c) => (
                    <div className="row">
                      <Avatar name={c.fullName || '—'} />
                      <div className="truncate">
                        <div className="cell-main truncate">{c.fullName || '—'}</div>
                        <div className="cell-sub ltr">{f.phone(c.phone)}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'tier',
                  header: t('customers.membership'),
                  hideOnSmall: true,
                  cell: (c) => (
                    <Badge tone="accent">{f.text(membershipLabels[c.membership])}</Badge>
                  ),
                },
                {
                  id: 'bookings',
                  header: t('customers.bookings'),
                  align: 'end',
                  cell: (c) => c.bookingsCount,
                },
                {
                  id: 'spent',
                  header: t('customers.spent'),
                  align: 'end',
                  hideOnSmall: true,
                  cell: (c) => f.money(c.totalSpent),
                },
                {
                  id: 'last',
                  header: t('customers.lastBooking'),
                  hideOnSmall: true,
                  cell: (c) =>
                    c.lastBookingAt ? f.date(c.lastBookingAt, 'medium') : t('customers.never'),
                },
                {
                  id: 'status',
                  header: t('common.status'),
                  cell: (c) =>
                    c.status === 'active' ? (
                      <Badge tone="success">{t('customers.active')}</Badge>
                    ) : (
                      <Badge tone="danger">{t('customers.blocked')}</Badge>
                    ),
                },
              ]}
            />
            {customers.data ? (
              <Pagination
                page={customers.data.page}
                pageSize={customers.data.pageSize}
                total={customers.data.total}
                onPage={(p) => apply({ page: p })}
              />
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
