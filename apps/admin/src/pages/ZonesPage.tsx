import { MapPinned } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState, ErrorState, LoadingRows, Notice } from '@/components/ui';
import {
  useAreas,
  useCategories,
  useGovernorates,
  useTechnicians,
  useVendors,
} from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';

/**
 * Coverage by governorate. Geography is shared configuration (not editable
 * through the API); coverage is derived from active professionals and companies.
 */
export function ZonesPage() {
  const { t } = useLocale();
  const f = useFormat();
  const governorates = useGovernorates();
  const areas = useAreas();
  const technicians = useTechnicians({ status: 'active', pageSize: 100 });
  const vendors = useVendors();
  const categories = useCategories();
  const loading = governorates.isPending || areas.isPending || technicians.isPending;
  const failed = governorates.isError || areas.isError || technicians.isError;

  return (
    <div className="page">
      <PageHeader
        title={t('zones.title')}
        subtitle={t('zones.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('zones.title') }]}
      />
      <Notice>{t('zones.configNote')}</Notice>
      {loading ? (
        <Card>
          <LoadingRows />
        </Card>
      ) : failed ? (
        <Card>
          <ErrorState
            onRetry={() => {
              void governorates.refetch();
              void areas.refetch();
              void technicians.refetch();
            }}
          />
        </Card>
      ) : !governorates.data?.length ? (
        <Card>
          <EmptyState icon={MapPinned} title={t('common.notFound')} />
        </Card>
      ) : (
        <div className="grid grid--2">
          {governorates.data.map((g) => {
            const zoneAreas = (areas.data ?? []).filter((a) => a.governorateId === g.id);
            const pros = (technicians.data?.items ?? []).filter((tech) =>
              tech.governorateIds.includes(g.id),
            );
            const online = pros.filter((p) => p.isOnline).length;
            const companies = (vendors.data ?? []).filter(
              (v) => v.status === 'active' && v.governorateIds.includes(g.id),
            );
            const covered = new Set(pros.flatMap((p) => p.categoryIds));
            return (
              <Card
                key={g.id}
                title={f.text(g.name)}
                actions={
                  <span className="small muted">
                    {t('zones.areas', { count: zoneAreas.length })}
                  </span>
                }
              >
                <div className="stack">
                  <div className="row row--wrap" style={{ gap: 8 }}>
                    <Badge tone={pros.length ? 'success' : 'danger'}>
                      {t('zones.professionalsCount', { count: pros.length })}
                    </Badge>
                    <Badge tone="info">{t('zones.online', { count: online })}</Badge>
                    <Badge>{t('zones.companiesCount', { count: companies.length })}</Badge>
                  </div>
                  {pros.length === 0 ? (
                    <Notice tone="warning">{t('zones.noCoverage')}</Notice>
                  ) : null}
                  <div>
                    <div className="overline" style={{ marginBottom: 6 }}>
                      {t('zones.categories')}
                    </div>
                    <div className="tags">
                      {(categories.data ?? []).map((c) => (
                        <span
                          key={c.id}
                          className={`tag${covered.has(c.id) ? '' : ' tag--off'}`}
                          title={covered.has(c.id) ? undefined : t('zones.uncovered')}
                        >
                          {f.text(c.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <details>
                    <summary className="small strong" style={{ cursor: 'pointer' }}>
                      {t('zones.areaList')}
                    </summary>
                    <div className="tags" style={{ marginTop: 8 }}>
                      {zoneAreas.map((a) => (
                        <span key={a.id} className="tag">
                          {f.text(a.name)}
                        </span>
                      ))}
                    </div>
                  </details>
                  {pros.length ? (
                    <Link className="small" to={`/technicians?status=active`}>
                      {t('zones.viewProfessionals')}
                    </Link>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
