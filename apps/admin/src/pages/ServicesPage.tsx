import type { Service } from '@myhome/shared';
import { Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState, ErrorState, Field, Input, Select } from '@/components/ui';
import { useCategories, useServices } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { mediaUrl } from '@/lib/media';
import { type SortState, nextSort, sortRows } from '@/lib/sort';
import { useLocale } from '@/providers/LocaleProvider';

type Key = 'name' | 'price' | 'rating' | 'bookings';

export function ServicesPage() {
  const { t, locale } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category') ?? '';
  const visibility = params.get('visibility') ?? '';
  const q = params.get('q') ?? '';
  const services = useServices({
    ...(categoryId ? { categoryId } : {}),
    ...(q ? { search: q } : {}),
  });
  const categories = useCategories();
  const [search, setSearch] = useState({ value: q, synced: q });
  if (search.synced !== q) setSearch({ value: q, synced: q });
  const [sort, setSort] = useState<SortState<Key> | null>(null);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = services.data?.filter((s) =>
    visibility === 'visible' ? s.isActive : visibility === 'hidden' ? !s.isActive : true,
  );
  const rows = filtered
    ? sortRows(
        filtered,
        sort,
        (s, key) =>
          ({
            name: f.text(s.name),
            price: s.basePrice,
            rating: s.rating,
            bookings: s.bookingsCount,
          })[key],
        locale,
      )
    : undefined;
  const categoryName = (id: string) => {
    const c = categories.data?.find((x) => x.id === id);
    return c ? f.text(c.name) : '';
  };

  return (
    <div className="page">
      <PageHeader
        title={t('services.title')}
        subtitle={t('services.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('services.title') }]}
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
                  placeholder={t('services.searchPlaceholder')}
                  onChange={(e) => setSearch({ ...search, value: e.target.value })}
                  onBlur={() => search.value.trim() !== q && set('q', search.value.trim())}
                />
              </div>
            )}
          </Field>
          <Field label={t('services.category')}>
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
          <Field label={t('services.visibility')}>
            {(props) => (
              <Select
                {...props}
                value={visibility}
                onChange={(e) => set('visibility', e.target.value)}
              >
                <option value="">{t('bookings.any')}</option>
                <option value="visible">{t('services.visible')}</option>
                <option value="hidden">{t('services.hidden')}</option>
              </Select>
            )}
          </Field>
        </form>
      </Card>
      <Card flush>
        {services.isError ? (
          <ErrorState onRetry={() => void services.refetch()} />
        ) : (
          <DataTable<Service, Key>
            caption={t('services.title')}
            rows={rows}
            loading={services.isPending}
            rowKey={(s) => s.id}
            rowLabel={(s) => f.text(s.name)}
            onRowClick={(s) => navigate(`/services/${s.id}`)}
            sort={sort}
            onSort={(key) => setSort((s) => nextSort(s, key))}
            empty={<EmptyState icon={Sparkles} title={t('services.emptyTitle')} />}
            columns={[
              {
                id: 'name',
                header: t('services.service'),
                sortKey: 'name',
                cell: (s) => (
                  <div className="row">
                    <img className="thumb" src={mediaUrl(s.image)} alt="" />
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-main">{f.text(s.name)}</div>
                      <div className="cell-sub">{categoryName(s.categoryId)}</div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'model',
                header: t('services.model'),
                hideOnSmall: true,
                cell: (s) => t(`services.models.${s.pricingModel}`),
              },
              {
                id: 'price',
                header: t('services.basePrice'),
                sortKey: 'price',
                align: 'end',
                cell: (s) => (
                  <>
                    <div className="num">{f.money(s.basePrice)}</div>
                    {s.unitLabel ? <div className="cell-sub">{f.text(s.unitLabel)}</div> : null}
                  </>
                ),
              },
              {
                id: 'rating',
                header: t('services.rating'),
                sortKey: 'rating',
                align: 'end',
                hideOnSmall: true,
                cell: (s) => f.rating(s.rating),
              },
              {
                id: 'bookings',
                header: t('services.bookings'),
                sortKey: 'bookings',
                align: 'end',
                hideOnSmall: true,
                cell: (s) => s.bookingsCount,
              },
              {
                id: 'visibility',
                header: t('services.visibility'),
                cell: (s) => (
                  <div className="row row--wrap" style={{ gap: 6 }}>
                    <Badge tone={s.isActive ? 'success' : 'neutral'}>
                      {s.isActive ? t('services.visible') : t('services.hidden')}
                    </Badge>
                    {s.isPopular ? <Badge tone="accent">{t('services.popular')}</Badge> : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
