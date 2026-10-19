import { type TechnicianRow, type TechnicianStatus, technicianStatusLabels } from '@myhome/shared';
import { FileWarning, Search, Star, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataTable, Pagination } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Notice,
  Select,
} from '@/components/ui';
import { useCategories, useTechnicians, useVendors } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import { documentsNeedingAttention } from '@/lib/technicians';
import { useLocale } from '@/providers/LocaleProvider';
import { readPreferences } from '@/services/preferences';

const STATUSES: TechnicianStatus[] = ['pending_approval', 'active', 'suspended'];
const statusTone = { pending_approval: 'warning', active: 'success', suspended: 'danger' } as const;

export function TechniciansPage() {
  const { t } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (STATUSES as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as TechnicianStatus)
    : undefined;
  const vendorId = params.get('vendor') ?? '';
  const categoryId = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const attention = params.get('attention') === 'documents';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = readPreferences().pageSize;
  const technicians = useTechnicians({
    ...(status ? { status } : {}),
    ...(vendorId ? { vendorId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q ? { search: q } : {}),
    // The documents view filters locally, so it reads the whole directory.
    page: attention ? 1 : page,
    pageSize: attention ? 100 : pageSize,
  });
  const vendors = useVendors();
  const categories = useCategories();
  const [search, setSearch] = useState({ value: q, synced: q });
  if (search.synced !== q) setSearch({ value: q, synced: q });
  const now = useNow();
  const rows = attention
    ? technicians.data?.items.filter((tech) => documentsNeedingAttention(tech, now).length > 0)
    : technicians.data?.items;

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <div className="page">
      <PageHeader
        title={t('technicians.title')}
        subtitle={t('technicians.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('technicians.title') }]}
      />
      <Card>
        <form
          className="filters"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set('q', search.value.trim());
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
                  placeholder={t('technicians.searchPlaceholder')}
                  onChange={(e) => setSearch({ ...search, value: e.target.value })}
                  onBlur={() => search.value.trim() !== q && set('q', search.value.trim())}
                />
              </div>
            )}
          </Field>
          <Field label={t('common.status')}>
            {(props) => (
              <Select
                {...props}
                value={status ?? ''}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="">{t('bookings.any')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {f.text(technicianStatusLabels[s])}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('technicians.company')}>
            {(props) => (
              <Select {...props} value={vendorId} onChange={(e) => set('vendor', e.target.value)}>
                <option value="">{t('bookings.any')}</option>
                <option value="independent">{t('technicians.independent')}</option>
                {(vendors.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {f.text(v.name)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('bookings.category')}>
            {(props) => (
              <Select
                {...props}
                value={categoryId}
                onChange={(e) => set('category', e.target.value)}
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
          <Button
            variant={attention ? 'primary' : 'secondary'}
            icon={FileWarning}
            aria-pressed={attention}
            onClick={() => set('attention', attention ? '' : 'documents')}
          >
            {t('technicians.documents')}
          </Button>
        </form>
      </Card>
      {attention ? (
        <Notice tone="warning">
          {t('alerts.documentsExpiring', {
            count: (rows ?? []).reduce(
              (n, tech) => n + documentsNeedingAttention(tech, now).length,
              0,
            ),
          })}
        </Notice>
      ) : null}
      <Card flush>
        {technicians.isError ? (
          <ErrorState onRetry={() => void technicians.refetch()} />
        ) : (
          <>
            <DataTable<TechnicianRow>
              caption={t('technicians.title')}
              rows={rows}
              loading={technicians.isFetching}
              rowKey={(r) => r.id}
              rowLabel={(r) => r.fullName.en}
              onRowClick={(r) => navigate(`/technicians/${r.id}`)}
              empty={<EmptyState icon={Wrench} title={t('technicians.emptyTitle')} />}
              columns={[
                {
                  id: 'name',
                  header: t('technicians.name'),
                  cell: (r) => (
                    <div className="row">
                      <Avatar name={r.fullName.en} />
                      <div className="truncate">
                        <div className="cell-main truncate">{f.text(r.fullName)}</div>
                        <div className="cell-sub ltr">{f.phone(r.phone)}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'company',
                  header: t('technicians.company'),
                  hideOnSmall: true,
                  cell: (r) =>
                    r.vendorName ? (
                      f.text(r.vendorName)
                    ) : (
                      <span className="muted">{t('technicians.independent')}</span>
                    ),
                },
                {
                  id: 'skills',
                  header: t('technicians.skills'),
                  hideOnSmall: true,
                  cell: (r) =>
                    r.categoryIds
                      .map((cid) => categories.data?.find((c) => c.id === cid))
                      .filter(Boolean)
                      .map((c) => f.text(c!.name))
                      .join(', '),
                },
                {
                  id: 'rating',
                  header: t('technicians.rating'),
                  align: 'end',
                  cell: (r) => (
                    <span className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                      <Star size={13} aria-hidden fill="var(--accent)" color="var(--accent)" />
                      {f.rating(r.rating)}
                    </span>
                  ),
                },
                {
                  id: 'jobs',
                  header: t('technicians.jobs'),
                  align: 'end',
                  hideOnSmall: true,
                  cell: (r) => r.jobsCompleted,
                },
                {
                  id: 'presence',
                  header: t('technicians.presence'),
                  hideOnSmall: true,
                  cell: (r) =>
                    r.isOnline ? (
                      <Badge tone="success" dot>
                        {t('technicians.online')}
                      </Badge>
                    ) : (
                      <Badge>{t('technicians.offline')}</Badge>
                    ),
                },
                {
                  id: 'status',
                  header: t('common.status'),
                  cell: (r) => (
                    <Badge tone={statusTone[r.status]}>
                      {f.text(technicianStatusLabels[r.status])}
                    </Badge>
                  ),
                },
              ]}
            />
            {technicians.data && !attention ? (
              <Pagination
                page={technicians.data.page}
                pageSize={technicians.data.pageSize}
                total={technicians.data.total}
                onPage={(p) => {
                  const next = new URLSearchParams(params);
                  next.set('page', String(p));
                  setParams(next);
                }}
              />
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
