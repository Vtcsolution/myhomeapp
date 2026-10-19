import {
  calculatePrice,
  defaultSelections,
  isApiError,
  type MediaKey,
  type PriceBreakdown,
  type Service,
} from '@myhome/shared';
import { SearchX } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useParams } from 'react-router';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  ErrorState,
  Field,
  Input,
  KeyValues,
  LoadingRows,
  Notice,
  Switch,
  Textarea,
} from '@/components/ui';
import {
  useCategories,
  useServices,
  useUpdateService,
  useUpdateServicePricing,
} from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { mediaUrl, serviceImageChoices } from '@/lib/media';
import {
  draftFromService,
  type PricingDraft,
  pricingFromDraft,
  previewService,
} from '@/lib/pricingForm';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const f = useFormat();
  // The admin API lists services (including hidden ones); there is no single-service admin read.
  const services = useServices();
  const categories = useCategories();
  const crumbs = [
    { label: t('nav.dashboard'), to: '/' },
    { label: t('services.title'), to: '/services' },
  ];

  if (services.isPending) {
    return (
      <div className="page">
        <PageHeader title={t('common.loading')} crumbs={crumbs} />
        <Card>
          <LoadingRows />
        </Card>
      </div>
    );
  }
  const service = services.data?.find((s) => s.id === id);
  if (services.isError || !service) {
    return (
      <div className="page">
        <PageHeader title={t('services.title')} crumbs={crumbs} />
        <Card>
          {services.isError && !isApiError(services.error) ? (
            <ErrorState onRetry={() => void services.refetch()} />
          ) : (
            <EmptyState
              icon={SearchX}
              title={t('common.notFound')}
              body={t('common.notFoundBody')}
            />
          )}
        </Card>
      </div>
    );
  }

  const name = f.text(service.name);
  const category = categories.data?.find((c) => c.id === service.categoryId);
  return (
    <div className="page">
      <PageHeader
        title={name}
        subtitle={category ? f.text(category.name) : undefined}
        crumbs={[...crumbs, { label: name }]}
        badge={
          <Badge tone={service.isActive ? 'success' : 'neutral'}>
            {service.isActive ? t('services.visible') : t('services.hidden')}
          </Badge>
        }
      />
      <div className="grid grid--main-side">
        <div className="stack" style={{ gap: 16 }}>
          {/* Keyed by id so the forms start from the saved values of this service. */}
          <ContentForm key={`content-${service.id}`} service={service} />
          <PricingForm key={`pricing-${service.id}`} service={service} />
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <VisibilityCard service={service} />
          <Card title={t('services.pricingModel')}>
            <KeyValues
              items={[
                [t('services.model'), t(`services.models.${service.pricingModel}`)],
                ...(service.unitLabel
                  ? [[t('services.unitLabel'), f.text(service.unitLabel)] as [string, string]]
                  : []),
                [t('services.duration'), t('settings.minutes', { count: service.durationMin })],
                [
                  t('services.warranty'),
                  service.warrantyDays
                    ? t('services.warrantyDays', { count: service.warrantyDays })
                    : t('common.none'),
                ],
                [t('services.rating'), `${f.rating(service.rating)} · ${service.reviewsCount}`],
                [t('services.bookings'), service.bookingsCount],
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function VisibilityCard({ service }: { service: Service }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const update = useUpdateService();
  const [confirmHide, setConfirmHide] = useState(false);

  const save = (patch: { isActive?: boolean; isPopular?: boolean }, message: string) =>
    update.mutate(
      { id: service.id, patch },
      {
        onSuccess: () => {
          setConfirmHide(false);
          show(message);
        },
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );

  return (
    <Card title={t('services.visibility')}>
      <div className="stack">
        <div className="row row--between">
          <span>{t('services.visibleToggle')}</span>
          <Switch
            checked={service.isActive}
            label={t('services.visibleToggle')}
            disabled={update.isPending}
            onChange={(on) =>
              on ? save({ isActive: true }, t('services.shown')) : setConfirmHide(true)
            }
          />
        </div>
        <div className="row row--between">
          <span>{t('services.popularToggle')}</span>
          <Switch
            checked={service.isPopular}
            label={t('services.popularToggle')}
            disabled={update.isPending}
            onChange={(on) => save({ isPopular: on }, t('common.saved'))}
          />
        </div>
      </div>
      <ConfirmDialog
        open={confirmHide}
        title={`${t('services.hiddenToast')}?`}
        body={f.text(service.name)}
        confirmLabel={t('common.confirm')}
        destructive
        loading={update.isPending}
        onCancel={() => setConfirmHide(false)}
        onConfirm={() => save({ isActive: false }, t('services.hiddenToast'))}
      />
    </Card>
  );
}

function ContentForm({ service }: { service: Service }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const update = useUpdateService();
  const [name, setName] = useState(service.name);
  const [summary, setSummary] = useState(service.shortDescription);
  const [description, setDescription] = useState(service.description);
  const [image, setImage] = useState<MediaKey>(service.image);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    update.mutate(
      { id: service.id, patch: { name, shortDescription: summary, description, image } },
      {
        onSuccess: () => show(t('services.contentSaved')),
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Card title={t('services.content')}>
      <form className="stack" onSubmit={submit}>
        <div className="grid grid--2">
          <Field label={t('services.nameEn')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                value={name.en}
                onChange={(e) => setName({ ...name, en: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('services.nameAr')}>
            {(p) => (
              <Input
                {...p}
                dir="rtl"
                value={name.ar}
                onChange={(e) => setName({ ...name, ar: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('services.summaryEn')}>
            {(p) => (
              <Textarea
                {...p}
                className="textarea ltr"
                rows={2}
                value={summary.en}
                onChange={(e) => setSummary({ ...summary, en: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('services.summaryAr')}>
            {(p) => (
              <Textarea
                {...p}
                dir="rtl"
                rows={2}
                value={summary.ar}
                onChange={(e) => setSummary({ ...summary, ar: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('services.descriptionEn')}>
            {(p) => (
              <Textarea
                {...p}
                className="textarea ltr"
                rows={4}
                value={description.en}
                onChange={(e) => setDescription({ ...description, en: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('services.descriptionAr')}>
            {(p) => (
              <Textarea
                {...p}
                dir="rtl"
                rows={4}
                value={description.ar}
                onChange={(e) => setDescription({ ...description, ar: e.target.value })}
              />
            )}
          </Field>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label">{t('services.image')}</legend>
          <span className="field__hint">{t('services.imageHint')}</span>
          <div className="image-choices" role="radiogroup" aria-label={t('services.image')}>
            {serviceImageChoices.map((key) => (
              <label key={key} className="image-choice" title={key}>
                <input
                  type="radio"
                  name={`image-${service.id}`}
                  className="visually-hidden"
                  checked={image === key}
                  onChange={() => setImage(key)}
                />
                <img
                  src={mediaUrl(key)}
                  alt={key.replace(/^[a-z]+\./, '').replace(/-/g, ' ')}
                  loading="lazy"
                />
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="row row--between row--wrap">
          <span className="small muted">{f.text(service.name)}</span>
          <Button type="submit" variant="primary" loading={update.isPending}>
            {t('services.saveContent')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PricingForm({ service }: { service: Service }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const save = useUpdateServicePricing();
  const [draft, setDraft] = useState<PricingDraft>(() => draftFromService(service));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { input, errors, changed } = pricingFromDraft(service, draft);
  const unitPriced = service.pricingModel === 'per_unit' || service.pricingModel === 'hourly';
  const amountError = (key: string) =>
    submitted && errors[key]
      ? errors[key] === 'floor'
        ? t('services.invalidFloor')
        : t('services.invalidAmount')
      : null;

  let preview: PriceBreakdown | null;
  try {
    const next = previewService(service, input);
    preview = calculatePrice({ service: next, selections: defaultSelections(next) });
  } catch {
    preview = null;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (Object.keys(errors).length || !changed) return;
    save.mutate(
      { id: service.id, input },
      {
        onSuccess: (updated) => {
          setDraft(draftFromService(updated));
          setSubmitted(false);
          show(t('services.pricingSaved'));
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Card title={t('services.pricing')} actions={<DemoTag />}>
      <form className="stack" onSubmit={submit} noValidate>
        <Notice>{t('services.existingNote')}</Notice>
        <div className="grid grid--3">
          <Field label={t('services.basePriceKwd')} error={amountError('basePrice')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr num"
                inputMode="decimal"
                value={draft.basePrice}
                onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })}
              />
            )}
          </Field>
          {unitPriced ? (
            <>
              <Field
                label={t('services.minUnits')}
                error={submitted && errors.units ? t('services.invalidUnits') : null}
              >
                {(p) => (
                  <Input
                    {...p}
                    className="input ltr num"
                    inputMode="numeric"
                    value={draft.minUnits}
                    onChange={(e) => setDraft({ ...draft, minUnits: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t('services.maxUnits')}>
                {(p) => (
                  <Input
                    {...p}
                    className="input ltr num"
                    inputMode="numeric"
                    value={draft.maxUnits}
                    onChange={(e) => setDraft({ ...draft, maxUnits: e.target.value })}
                  />
                )}
              </Field>
            </>
          ) : null}
        </div>

        {service.optionGroups.map((group) => (
          <fieldset key={group.id} className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field__label">
              {t('services.options')} · {f.text(group.label)}
              {group.required ? ` (${t('services.required')})` : ''}
            </legend>
            <span className="field__hint" style={{ marginBottom: 8 }}>
              {t('services.deltaHint')}
            </span>
            <div className="grid grid--3">
              {group.choices.map((choice) => (
                <Field
                  key={choice.id}
                  label={`${f.text(choice.label)} · ${t('services.priceDelta')}`}
                  error={amountError(`option:${choice.id}`)}
                >
                  {(p) => (
                    <Input
                      {...p}
                      className="input ltr num"
                      inputMode="decimal"
                      value={draft.options[choice.id] ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: { ...draft.options, [choice.id]: e.target.value },
                        })
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          </fieldset>
        ))}

        {service.addOns.length ? (
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field__label" style={{ marginBottom: 8 }}>
              {t('services.addOns')}
            </legend>
            <div className="grid grid--3">
              {service.addOns.map((addOn) => (
                <Field
                  key={addOn.id}
                  label={`${f.text(addOn.name)} · ${t('services.addOnPrice')}`}
                  error={amountError(`addon:${addOn.id}`)}
                >
                  {(p) => (
                    <Input
                      {...p}
                      className="input ltr num"
                      inputMode="decimal"
                      value={draft.addOns[addOn.id] ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          addOns: { ...draft.addOns, [addOn.id]: e.target.value },
                        })
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="card" style={{ padding: 16 }} aria-live="polite">
          <div className="overline">{t('services.preview')}</div>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>
            {t('services.previewBody')}
          </p>
          {preview ? (
            <KeyValues
              items={[
                ...preview.items.map(
                  (item) =>
                    [
                      item.quantity > 1
                        ? `${f.text(item.label)} × ${item.quantity}`
                        : f.text(item.label),
                      <span className="num">{f.money(item.total)}</span>,
                    ] as [string, ReactNode],
                ),
                [t('booking.visitFee'), <span className="num">{f.money(preview.visitFee)}</span>],
                [
                  <strong>{t('booking.total')}</strong>,
                  <strong className="num">{f.money(preview.total)}</strong>,
                ],
              ]}
            />
          ) : (
            <span className="small muted">—</span>
          )}
        </div>

        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="row row--between row--wrap">
          <Button
            variant="ghost"
            disabled={!changed}
            onClick={() => {
              setDraft(draftFromService(service));
              setSubmitted(false);
            }}
          >
            {t('services.discard')}
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} disabled={!changed}>
            {t('services.savePricing')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
