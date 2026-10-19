import type { Service } from '@myhome/shared';
import { useCallback } from 'react';
import { useLocale } from '@/providers/LocaleProvider';
import { useFormat } from './useFormat';

/** "Fixed price", "Priced per AC unit", "Hourly rate", "Inspection visit". */
export function usePricingLabel() {
  const { t } = useLocale();
  const f = useFormat();
  return useCallback(
    (service: Service): string => {
      switch (service.pricingModel) {
        case 'fixed':
          return t('service.pricingFixed');
        case 'hourly':
          return t('service.pricingHourly');
        case 'inspection':
          return t('service.pricingInspection');
        case 'per_unit':
          return service.unitLabel
            ? t('service.pricingUnit', { unit: f.text(service.unitLabel) })
            : t('service.pricingFixed');
      }
    },
    [t, f],
  );
}
