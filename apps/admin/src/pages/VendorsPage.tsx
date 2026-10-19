import { vendorStatusLabels, type VendorRow } from '@myhome/shared';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Badge, Button, Card, EmptyState, ErrorState } from '@/components/ui';
import { VendorFormDialog } from '@/components/VendorForm';
import { useVendors } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { type SortState, nextSort, sortRows } from '@/lib/sort';
import { useLocale } from '@/providers/LocaleProvider';

type Key = 'name' | 'professionals' | 'jobs' | 'revenue' | 'rating';
const tone = { pending_approval: 'warning', active: 'success', suspended: 'danger' } as const;

export function VendorsPage() {
  const { t, locale } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const vendors = useVendors();
  const [sort, setSort] = useState<SortState<Key> | null>({ key: 'revenue', direction: 'desc' });
  const [creating, setCreating] = useState(false);
  const rows = vendors.data
    ? sortRows(
        vendors.data,
        sort,
        (v, key) =>
          ({
            name: f.text(v.name),
            professionals: v.techniciansCount,
            jobs: v.jobsCompleted,
            revenue: v.revenue,
            rating: v.rating,
          })[key],
        locale,
      )
    : undefined;

  return (
    <div className="page">
      <PageHeader
        title={t('vendors.title')}
        subtitle={t('vendors.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('vendors.title') }]}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            {t('vendors.create')}
          </Button>
        }
      />
      <Card flush>
        {vendors.isError ? (
          <ErrorState onRetry={() => void vendors.refetch()} />
        ) : (
          <DataTable<VendorRow, Key>
            caption={t('vendors.title')}
            rows={rows}
            loading={vendors.isPending}
            rowKey={(v) => v.id}
            rowLabel={(v) => f.text(v.name)}
            onRowClick={(v) => navigate(`/vendors/${v.id}`)}
            sort={sort}
            onSort={(key) => setSort((s) => nextSort(s, key))}
            empty={<EmptyState icon={Building2} title={t('vendors.emptyTitle')} />}
            columns={[
              {
                id: 'name',
                header: t('vendors.company'),
                sortKey: 'name',
                cell: (v) => (
                  <>
                    <div className="cell-main">{f.text(v.name)}</div>
                    <div className="cell-sub">{v.contactName}</div>
                  </>
                ),
              },
              {
                id: 'pros',
                header: t('vendors.professionals'),
                sortKey: 'professionals',
                align: 'end',
                cell: (v) => v.techniciansCount,
              },
              {
                id: 'jobs',
                header: t('vendors.jobs'),
                sortKey: 'jobs',
                align: 'end',
                hideOnSmall: true,
                cell: (v) => v.jobsCompleted,
              },
              {
                id: 'revenue',
                header: t('vendors.revenue'),
                sortKey: 'revenue',
                align: 'end',
                cell: (v) => f.money(v.revenue),
              },
              {
                id: 'rating',
                header: t('technicians.rating'),
                sortKey: 'rating',
                align: 'end',
                hideOnSmall: true,
                cell: (v) => f.rating(v.rating),
              },
              {
                id: 'commission',
                header: t('vendors.commission'),
                align: 'end',
                hideOnSmall: true,
                cell: (v) => f.percent(v.commissionRate),
              },
              {
                id: 'status',
                header: t('common.status'),
                cell: (v) => (
                  <Badge tone={tone[v.status]}>{f.text(vendorStatusLabels[v.status])}</Badge>
                ),
              },
            ]}
          />
        )}
      </Card>
      {creating ? <VendorFormDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
