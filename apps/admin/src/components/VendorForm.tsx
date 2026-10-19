import type { VendorInput, VendorRow } from '@myhome/shared';
import { type FormEvent, useState } from 'react';
import { useCategories, useCreateVendor, useGovernorates, useUpdateVendor } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button, Dialog, Field, Input, Notice } from './ui';

const empty: VendorInput = {
  name: { en: '', ar: '' },
  legalName: '',
  crNumber: '',
  contactName: '',
  phone: '',
  email: '',
  categoryIds: [],
  governorateIds: [],
  commissionRate: 0.12,
};

/**
 * Create or edit a partner company. Rules (CR format, Kuwaiti phone,
 * commission range…) are enforced by the API; its explanation is shown here.
 */
export function VendorFormDialog({ vendor, onClose }: { vendor?: VendorRow; onClose: () => void }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const categories = useCategories();
  const governorates = useGovernorates();
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const [form, setForm] = useState<VendorInput>(() =>
    vendor
      ? {
          name: vendor.name,
          legalName: vendor.legalName,
          crNumber: vendor.crNumber,
          contactName: vendor.contactName,
          phone: vendor.phone,
          email: vendor.email,
          categoryIds: vendor.categoryIds,
          governorateIds: vendor.governorateIds,
          commissionRate: vendor.commissionRate,
        }
      : empty,
  );
  const [percent, setPercent] = useState(String(Math.round(form.commissionRate * 1000) / 10));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof VendorInput>(key: K, value: VendorInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: 'categoryIds' | 'governorateIds', id: string) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id as never)
        ? current[key].filter((x) => x !== id)
        : [...current[key], id],
    }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const rate = Number(percent) / 100;
    const input = { ...form, commissionRate: Number.isFinite(rate) ? rate : -1 };
    const done = {
      onSuccess: () => {
        show(vendor ? t('vendors.saved') : t('vendors.created'));
        onClose();
      },
      onError: (e: unknown) => setError(errorMessage(e)),
    };
    if (vendor) update.mutate({ id: vendor.id, patch: input }, done);
    else create.mutate(input, done);
  };

  return (
    <Dialog
      open
      wide
      title={
        vendor ? t('vendors.editTitle', { name: f.text(vendor.name) }) : t('vendors.createTitle')
      }
      onClose={onClose}
    >
      <form className="stack" onSubmit={submit} noValidate>
        <div className="grid grid--2">
          <Field label={t('vendors.nameEn')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                value={form.name.en}
                onChange={(e) => set('name', { ...form.name, en: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('vendors.nameAr')}>
            {(p) => (
              <Input
                {...p}
                dir="rtl"
                value={form.name.ar}
                onChange={(e) => set('name', { ...form.name, ar: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('vendors.legalName')}>
            {(p) => (
              <Input
                {...p}
                value={form.legalName}
                onChange={(e) => set('legalName', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('vendors.cr')} hint="CR-123456">
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                value={form.crNumber}
                onChange={(e) => set('crNumber', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('vendors.contactName')}>
            {(p) => (
              <Input
                {...p}
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('vendors.phone')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('vendors.email')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('vendors.commissionPercent')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            )}
          </Field>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label">{t('vendors.categories')}</legend>
          <div className="checks">
            {(categories.data ?? []).map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(c.id)}
                  onChange={() => toggle('categoryIds', c.id)}
                />
                {f.text(c.name)}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label">{t('vendors.governorates')}</legend>
          <div className="checks">
            {(governorates.data ?? []).map((g) => (
              <label key={g.id} className="check">
                <input
                  type="checkbox"
                  checked={form.governorateIds.includes(g.id)}
                  onChange={() => toggle('governorateIds', g.id)}
                />
                {f.text(g.name)}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending || update.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
