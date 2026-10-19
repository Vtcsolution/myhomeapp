import {
  isApiError,
  type TechnicianRow,
  technicianStatusLabels,
  vendorStatusLabels,
  type VendorStatus,
} from '@myhome/shared';
import { BadgeCheck, PauseCircle, Pencil, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  ErrorState,
  KeyValues,
  LoadingRows,
} from '@/components/ui';
import { VendorFormDialog } from '@/components/VendorForm';
import {
  useCategories,
  useGovernorates,
  useSetVendorStatus,
  useTechnicians,
  useVendor,
} from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

const tone = { pending_approval: 'warning', active: 'success', suspended: 'danger' } as const;

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const f = useFormat();
  const navigate = useNavigate();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const vendor = useVendor(id);
  const members = useTechnicians({ vendorId: id, pageSize: 100 });
  const categories = useCategories();
  const governorates = useGovernorates();
  const setStatus = useSetVendorStatus();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<VendorStatus | null>(null);
  const crumbs = [
    { label: t('nav.dashboard'), to: '/' },
    { label: t('vendors.title'), to: '/vendors' },
  ];

  if (vendor.isPending) {
    return (
      <div className="page">
        <PageHeader title={t('common.loading')} crumbs={crumbs} />
        <Card>
          <LoadingRows />
        </Card>
      </div>
    );
  }
  if (vendor.isError || !vendor.data) {
    return (
      <div className="page">
        <PageHeader title={t('vendors.title')} crumbs={crumbs} />
        <Card>
          {isApiError(vendor.error) && vendor.error.code === 'NOT_FOUND' ? (
            <EmptyState icon={SearchX} title={t('common.notFound')} />
          ) : (
            <ErrorState onRetry={() => void vendor.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const v = vendor.data;
  const name = f.text(v.name);

  return (
    <div className="page">
      <PageHeader
        title={name}
        subtitle={v.legalName}
        crumbs={[...crumbs, { label: name }]}
        badge={<Badge tone={tone[v.status]}>{f.text(vendorStatusLabels[v.status])}</Badge>}
        actions={
          <>
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              {t('vendors.edit')}
            </Button>
            {v.status === 'active' ? (
              <Button
                variant="ghost"
                className="danger-text"
                icon={PauseCircle}
                onClick={() => setPending('suspended')}
              >
                {t('vendors.suspend')}
              </Button>
            ) : (
              <Button variant="primary" icon={BadgeCheck} onClick={() => setPending('active')}>
                {t('vendors.activate')}
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid--main-side">
        <div className="stack" style={{ gap: 16 }}>
          <div className="grid grid--3">
            <div className="card kpi">
              <span className="overline">{t('vendors.professionals')}</span>
              <span className="kpi__value">{v.techniciansCount}</span>
            </div>
            <div className="card kpi">
              <span className="overline">{t('vendors.jobs')}</span>
              <span className="kpi__value">{v.jobsCompleted}</span>
            </div>
            <div className="card kpi">
              <div className="row row--between">
                <span className="overline">{t('vendors.revenue')}</span>
                <DemoTag />
              </div>
              <span className="kpi__value">{f.money(v.revenue, { compact: true })}</span>
            </div>
          </div>
          <Card title={t('vendors.members')} flush>
            <DataTable<TechnicianRow>
              caption={t('vendors.members')}
              rows={members.data?.items}
              loading={members.isPending}
              rowKey={(m) => m.id}
              rowLabel={(m) => m.fullName.en}
              onRowClick={(m) => navigate(`/technicians/${m.id}`)}
              empty={<EmptyState title={t('vendors.noMembers')} />}
              columns={[
                {
                  id: 'name',
                  header: t('technicians.name'),
                  cell: (m) => (
                    <div className="row">
                      <Avatar name={m.fullName.en} />
                      <span className="strong">{f.text(m.fullName)}</span>
                    </div>
                  ),
                },
                {
                  id: 'rating',
                  header: t('technicians.rating'),
                  align: 'end',
                  cell: (m) => f.rating(m.rating),
                },
                {
                  id: 'jobs',
                  header: t('technicians.jobs'),
                  align: 'end',
                  hideOnSmall: true,
                  cell: (m) => m.jobsCompleted,
                },
                {
                  id: 'status',
                  header: t('common.status'),
                  cell: (m) => (
                    <Badge tone={tone[m.status]}>{f.text(technicianStatusLabels[m.status])}</Badge>
                  ),
                },
              ]}
            />
          </Card>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('vendors.contact')}>
            <KeyValues
              items={[
                [t('vendors.contactName'), v.contactName],
                [t('vendors.phone'), <span className="ltr">{f.phone(v.phone)}</span>],
                [t('vendors.email'), <span className="ltr">{v.email}</span>],
                [t('vendors.cr'), <span className="ltr">{v.crNumber}</span>],
                [t('vendors.commission'), f.percent(v.commissionRate)],
                [t('technicians.joined'), f.date(v.joinedAt, 'medium')],
              ]}
            />
          </Card>
          <Card title={t('vendors.coverage')}>
            <div className="overline" style={{ marginBottom: 8 }}>
              {t('vendors.categories')}
            </div>
            <div className="tags">
              {v.categoryIds.map((cid) => {
                const c = categories.data?.find((x) => x.id === cid);
                return c ? (
                  <span key={cid} className="tag">
                    {f.text(c.name)}
                  </span>
                ) : null;
              })}
            </div>
            <div className="overline" style={{ margin: '16px 0 8px' }}>
              {t('vendors.governorates')}
            </div>
            <div className="tags">
              {v.governorateIds.map((gid) => {
                const g = governorates.data?.find((x) => x.id === gid);
                return g ? (
                  <span key={gid} className="tag">
                    {f.text(g.name)}
                  </span>
                ) : null;
              })}
            </div>
          </Card>
        </div>
      </div>

      {editing ? <VendorFormDialog vendor={v} onClose={() => setEditing(false)} /> : null}
      <ConfirmDialog
        open={pending !== null}
        title={
          pending === 'active'
            ? t('vendors.activateTitle', { name })
            : t('vendors.suspendTitle', { name })
        }
        body={pending === 'active' ? t('vendors.activateBody') : t('vendors.suspendBody')}
        confirmLabel={pending === 'active' ? t('vendors.activate') : t('vendors.suspend')}
        destructive={pending === 'suspended'}
        loading={setStatus.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() =>
          pending &&
          setStatus.mutate(
            { id: v.id, status: pending },
            {
              onSuccess: () => {
                setPending(null);
                show(t('vendors.statusChanged'));
              },
              onError: (e) => show(errorMessage(e), 'error'),
            },
          )
        }
      />
    </div>
  );
}
