import { isApiError } from '@myhome/shared';
import { useCallback } from 'react';
import { useLocale } from '@/providers/LocaleProvider';

/** Maps API error codes to localised, user-facing messages. */
export function useErrorMessage() {
  const { t } = useLocale();
  return useCallback(
    (error: unknown): string => {
      if (!isApiError(error)) return t('errors.generic');
      switch (error.code) {
        case 'NOT_REGISTERED':
          return t('errors.notRegistered');
        case 'ACCOUNT_BLOCKED':
          return t('errors.blocked');
        case 'NETWORK':
          return t('errors.network');
        case 'OTP_INVALID':
          return t('verify.wrongCode');
        case 'OTP_EXPIRED':
          return t('verify.expired');
        default:
          return t('errors.generic');
      }
    },
    [t],
  );
}
