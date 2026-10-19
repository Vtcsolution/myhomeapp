import { brand, businessConfig, weekdayName } from '@myhome/shared';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Button, Card, ConfirmDialog, KeyValues, Notice, Segmented, Switch } from '@/components/ui';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';
import { resetDemoData } from '@/services/api';
import { type AlertPreferences, readPreferences, writePreferences } from '@/services/preferences';

const ALERT_KEYS: (keyof AlertPreferences)[] = [
  'unassignedSoon',
  'pendingExtraCharges',
  'openTickets',
  'flaggedReviews',
  'documentsExpiring',
  'payoutsDue',
  'pendingApprovals',
];
const PAGE_SIZES = ['10', '20', '50'] as const;
const WEEK = [6, 0, 1, 2, 3, 4, 5] as const; // Saturday first, as in Kuwait

export function SettingsPage() {
  const { t, locale } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const { expire } = useSession();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState(() => readPreferences());
  const [resetting, setResetting] = useState(false);
  const c = businessConfig;

  const update = (patch: Partial<typeof prefs>) => {
    setPrefs(writePreferences(patch));
    // The bell reads preferences when it renders; refresh it.
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    show(t('settings.prefsSaved'));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('settings.title') }]}
      />
      <div className="grid grid--main-side">
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('settings.business')}>
            <Notice>{t('settings.businessNote')}</Notice>
            <div style={{ marginTop: 12 }}>
              <KeyValues
                items={[
                  [t('settings.currency'), c.currency],
                  [t('settings.timezone'), 'Asia/Kuwait (UTC+3)'],
                  [t('settings.visitFee'), f.money(c.visitFee)],
                  [t('settings.freeVisit'), f.money(c.freeVisitThreshold)],
                  [t('settings.tax'), f.percent(c.taxRate)],
                  [
                    t('settings.freeCancellation'),
                    t('settings.hoursBefore', { count: c.freeCancellationHours }),
                  ],
                  [t('settings.lateFee'), f.money(c.lateCancellationFee)],
                  [t('settings.leadTime'), t('settings.minutes', { count: c.minLeadTimeMinutes })],
                  [t('settings.slotLength'), t('settings.minutes', { count: c.slotLengthMinutes })],
                  [t('settings.horizon'), t('settings.days', { count: c.bookingHorizonDays })],
                  [t('settings.commission'), f.percent(c.defaultCommissionRate)],
                ]}
              />
            </div>
            <h3 className="h3" style={{ margin: '20px 0 8px' }}>
              {t('settings.workingHours')}
            </h3>
            <KeyValues
              items={WEEK.map((d) => [
                weekdayName(d, locale),
                <span className="num ltr">{`${c.workingHours[d].open} – ${c.workingHours[d].close}`}</span>,
              ])}
            />
          </Card>
          <Card title={t('settings.brand')}>
            <Notice>{t('settings.brandNote')}</Notice>
            <div style={{ marginTop: 12 }}>
              <KeyValues
                items={[
                  [t('settings.name'), `${brand.name} · ${brand.name_ar}`],
                  [
                    t('settings.supportPhone'),
                    <span className="ltr">{f.phone(brand.support.phone)}</span>,
                  ],
                  [t('settings.supportEmail'), <span className="ltr">{brand.support.email}</span>],
                  [t('settings.supportHours'), f.text(brand.support.hours)],
                ]}
              />
            </div>
            <div className="row row--wrap" style={{ gap: 8, marginTop: 16 }} aria-hidden>
              {(
                [
                  'primary',
                  'accent',
                  'background',
                  'surface',
                  'success',
                  'warning',
                  'danger',
                  'info',
                ] as const
              ).map((k) => (
                <span
                  key={k}
                  className="swatch"
                  title={k}
                  style={{ background: brand.palette.light[k] }}
                />
              ))}
            </div>
          </Card>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <Card title={t('settings.alerts')}>
            <p className="small secondary" style={{ marginTop: 0 }}>
              {t('settings.alertsNote')}
            </p>
            <div className="stack" style={{ gap: 10 }}>
              {ALERT_KEYS.map((key) => (
                <div key={key} className="row row--between" style={{ gap: 12 }}>
                  <span className="small">{t(`settings.alertLabels.${key}`)}</span>
                  <Switch
                    checked={prefs.alerts[key]}
                    label={t(`settings.alertLabels.${key}`)}
                    onChange={(on) => update({ alerts: { ...prefs.alerts, [key]: on } })}
                  />
                </div>
              ))}
            </div>
          </Card>
          <Card title={t('settings.table')}>
            <div className="field">
              <span className="field__label">{t('settings.pageSize')}</span>
              <Segmented
                label={t('settings.pageSize')}
                value={String(prefs.pageSize) as (typeof PAGE_SIZES)[number]}
                onChange={(v) => update({ pageSize: Number(v) })}
                options={PAGE_SIZES.map((v) => ({ value: v, label: v }))}
              />
            </div>
          </Card>
          <Card title={t('settings.demo')}>
            <p className="small secondary" style={{ marginTop: 0 }}>
              {t('settings.demoBody')}
            </p>
            <Button variant="danger" icon={RotateCcw} onClick={() => setResetting(true)}>
              {t('settings.reset')}
            </Button>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={resetting}
        title={t('settings.resetTitle')}
        body={t('settings.resetBody')}
        confirmLabel={t('settings.reset')}
        destructive
        onCancel={() => setResetting(false)}
        onConfirm={() => {
          resetDemoData();
          setResetting(false);
          expire();
        }}
      />
    </div>
  );
}
