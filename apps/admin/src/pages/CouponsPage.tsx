import type { Coupon } from '@myhome/shared';
import { Pause, Pencil, Play, Plus, TicketPercent } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Notice,
  Segmented,
  Switch,
} from '@/components/ui';
import { useCategories, useCoupons, useSaveCoupon, useSetCouponActive } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import {
  type CouponDraft,
  type CouponField,
  couponFromDraft,
  couponState,
  couponStateTone,
  draftFromCoupon,
  newCouponDraft,
} from '@/lib/coupons';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

export function CouponsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const now = useNow();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const coupons = useCoupons();
  const setActive = useSetCouponActive();
  const [editing, setEditing] = useState<CouponDraft | null>(null);
  const [pausing, setPausing] = useState<Coupon | null>(null);

  const toggle = (coupon: Coupon, isActive: boolean) =>
    setActive.mutate(
      { id: coupon.id, isActive },
      {
        onSuccess: () => {
          setPausing(null);
          show(isActive ? t('coupons.activated') : t('coupons.deactivated'));
        },
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );

  const valueLabel = (c: Coupon) =>
    c.type === 'percent'
      ? t('coupons.off', { value: `${c.value}%` }) +
        (c.maxDiscount ? ` · ${t('coupons.upTo', { amount: f.money(c.maxDiscount) })}` : '')
      : t('coupons.off', { value: f.money(c.value) });

  return (
    <div className="page">
      <PageHeader
        title={t('coupons.title')}
        subtitle={t('coupons.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('coupons.title') }]}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing(newCouponDraft(now))}>
            {t('coupons.create')}
          </Button>
        }
      />
      <Notice>{t('coupons.checkoutNote')}</Notice>
      <Card flush>
        {coupons.isError ? (
          <ErrorState onRetry={() => void coupons.refetch()} />
        ) : (
          <DataTable<Coupon>
            caption={t('coupons.title')}
            rows={coupons.data}
            loading={coupons.isPending}
            rowKey={(c) => c.id}
            empty={<EmptyState icon={TicketPercent} title={t('coupons.emptyTitle')} />}
            columns={[
              {
                id: 'code',
                header: t('coupons.code'),
                cell: (c) => (
                  <>
                    <div className="cell-main ltr" style={{ letterSpacing: '0.06em' }}>
                      {c.code}
                    </div>
                    <div className="cell-sub">{f.text(c.description)}</div>
                  </>
                ),
              },
              {
                id: 'value',
                header: t('coupons.value'),
                cell: (c) => (
                  <>
                    <div className="num">{valueLabel(c)}</div>
                    <div className="cell-sub">
                      {c.minSubtotal
                        ? t('coupons.minOrder', { amount: f.money(c.minSubtotal) })
                        : null}
                      {c.firstBookingOnly ? ` · ${t('coupons.firstBooking')}` : ''}
                    </div>
                  </>
                ),
              },
              {
                id: 'validity',
                header: t('coupons.validity'),
                hideOnSmall: true,
                cell: (c) => (
                  <span className="num">
                    {f.date(c.validFrom, 'dayMonth')} –{' '}
                    {f.date(new Date(Date.parse(c.validUntil) - 1), 'medium')}
                  </span>
                ),
              },
              {
                id: 'usage',
                header: t('coupons.usage'),
                align: 'end',
                hideOnSmall: true,
                cell: (c) => (
                  <span className="num">
                    {t('coupons.usedOf', { used: c.usedCount, limit: c.usageLimit })}
                  </span>
                ),
              },
              {
                id: 'state',
                header: t('coupons.state'),
                cell: (c) => {
                  const state = couponState(c, now);
                  return <Badge tone={couponStateTone[state]}>{t(`coupons.${state}`)}</Badge>;
                },
              },
              {
                id: 'actions',
                header: t('common.edit'),
                align: 'end',
                cell: (c) => (
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Pencil}
                      onClick={() => setEditing(draftFromCoupon(c))}
                    >
                      {t('common.edit')}
                    </Button>
                    {c.isActive ? (
                      <Button size="sm" variant="ghost" icon={Pause} onClick={() => setPausing(c)}>
                        {t('coupons.deactivate')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Play}
                        loading={setActive.isPending && setActive.variables?.id === c.id}
                        onClick={() => toggle(c, true)}
                      >
                        {t('coupons.activate')}
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
      {editing ? <CouponDialog draft={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={pausing !== null}
        title={pausing ? t('coupons.pauseTitle', { code: pausing.code }) : ''}
        body={t('coupons.pauseBody')}
        confirmLabel={t('coupons.deactivate')}
        destructive
        loading={setActive.isPending}
        onCancel={() => setPausing(null)}
        onConfirm={() => pausing && toggle(pausing, false)}
      />
    </div>
  );
}

function CouponDialog({ draft: initial, onClose }: { draft: CouponDraft; onClose: () => void }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const categories = useCategories();
  const save = useSaveCoupon();
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { input, errors } = couponFromDraft(draft);
  const err = (field: CouponField, message: string) =>
    submitted && errors.includes(field) ? message : null;
  const set = <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (!input) return;
    save.mutate(input, {
      onSuccess: () => {
        show(t('coupons.saved'));
        onClose();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  };

  return (
    <Dialog open wide title={draft.id ? t('coupons.edit') : t('coupons.create')} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="grid grid--2">
          <Field label={t('coupons.code')} error={err('code', t('coupons.errors.code'))}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                autoCapitalize="characters"
                value={draft.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
              />
            )}
          </Field>
          <div className="field">
            <span className="field__label">{t('coupons.type')}</span>
            <Segmented
              label={t('coupons.type')}
              value={draft.type}
              onChange={(type) => setDraft((d) => ({ ...d, type, value: '', maxDiscount: '' }))}
              options={[
                { value: 'percent', label: t('coupons.percent') },
                { value: 'fixed', label: t('coupons.fixed') },
              ]}
            />
          </div>
          <Field
            label={t('coupons.descriptionEn')}
            error={err('description', t('coupons.errors.description'))}
          >
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                value={draft.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('coupons.descriptionAr')}>
            {(p) => (
              <Input
                {...p}
                dir="rtl"
                value={draft.descriptionAr}
                onChange={(e) => set('descriptionAr', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={draft.type === 'percent' ? t('coupons.percentValue') : t('coupons.fixedValue')}
            error={err(
              'value',
              draft.type === 'percent' ? t('coupons.errors.percent') : t('services.invalidAmount'),
            )}
          >
            {(p) => (
              <Input
                {...p}
                className="input ltr num"
                inputMode="decimal"
                value={draft.value}
                onChange={(e) => set('value', e.target.value)}
              />
            )}
          </Field>
          {draft.type === 'percent' ? (
            <Field
              label={t('coupons.maxDiscount')}
              error={err('maxDiscount', t('services.invalidAmount'))}
            >
              {(p) => (
                <Input
                  {...p}
                  className="input ltr num"
                  inputMode="decimal"
                  value={draft.maxDiscount}
                  onChange={(e) => set('maxDiscount', e.target.value)}
                />
              )}
            </Field>
          ) : (
            <div />
          )}
          <Field
            label={t('coupons.minSubtotal')}
            error={err('minSubtotal', t('services.invalidAmount'))}
          >
            {(p) => (
              <Input
                {...p}
                className="input ltr num"
                inputMode="decimal"
                value={draft.minSubtotal}
                onChange={(e) => set('minSubtotal', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('coupons.usageLimit')}
            error={err('usageLimit', t('coupons.errors.usageLimit'))}
          >
            {(p) => (
              <Input
                {...p}
                className="input ltr num"
                inputMode="numeric"
                value={draft.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('coupons.validFrom')} error={err('dates', t('coupons.errors.dates'))}>
            {(p) => (
              <Input
                {...p}
                type="date"
                className="input ltr"
                value={draft.validFrom}
                onChange={(e) => set('validFrom', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('coupons.validUntil')}>
            {(p) => (
              <Input
                {...p}
                type="date"
                className="input ltr"
                value={draft.validUntil}
                onChange={(e) => set('validUntil', e.target.value)}
              />
            )}
          </Field>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label">{t('coupons.categories')}</legend>
          <span className="field__hint">{t('coupons.categoriesHint')}</span>
          <div className="checks">
            {(categories.data ?? []).map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={draft.categoryIds.includes(c.id)}
                  onChange={() =>
                    set(
                      'categoryIds',
                      draft.categoryIds.includes(c.id)
                        ? draft.categoryIds.filter((x) => x !== c.id)
                        : [...draft.categoryIds, c.id],
                    )
                  }
                />
                {f.text(c.name)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row row--between">
          <span>{t('coupons.firstBooking')}</span>
          <Switch
            checked={draft.firstBookingOnly}
            label={t('coupons.firstBooking')}
            onChange={(on) => set('firstBookingOnly', on)}
          />
        </div>
        <div className="row row--between">
          <span>{t('coupons.active')}</span>
          <Switch
            checked={draft.isActive}
            label={t('coupons.active')}
            onChange={(on) => set('isActive', on)}
          />
        </div>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
