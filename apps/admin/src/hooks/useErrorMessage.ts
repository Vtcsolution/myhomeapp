import { isApiError } from '@myhome/shared';
import { useCallback } from 'react';
import { useLocale } from '@/providers/LocaleProvider';

/**
 * Actionable error text. The simulated API explains business-rule rejections
 * in English (e.g. "This technician is not free at the scheduled time.");
 * in Arabic a localised general message is shown instead.
 */
export function useErrorMessage() {
  const { t, locale } = useLocale();
  return useCallback(
    (error: unknown): string => {
      if (isApiError(error) && (error.code === 'VALIDATION' || error.code === 'CONFLICT')) {
        return locale === 'en' ? error.message : t('common.checkDetails');
      }
      return t('common.actionFailed');
    },
    [t, locale],
  );
}
