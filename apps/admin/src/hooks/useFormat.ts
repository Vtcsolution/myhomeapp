import {
  type Address,
  type DateInput,
  type DateStyle,
  type Fils,
  formatAddress,
  formatDate,
  formatKuwaitPhone,
  formatMoney,
  formatRelative,
  formatTime,
  formatTimeRange,
  type LocalizedText,
  t as pickLocalized,
} from '@myhome/shared';
import { useMemo } from 'react';
import { useLocale } from '@/providers/LocaleProvider';

/** Shared Kuwait formatters (KWD, dates in Kuwait time, phones) bound to the active language. */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      text: (value: LocalizedText) => pickLocalized(value, locale),
      money: (amount: Fils, options?: { compact?: boolean }) =>
        formatMoney(amount, { locale, ...options }),
      date: (value: DateInput, style: DateStyle = 'medium') => formatDate(value, style, { locale }),
      time: (value: DateInput) => formatTime(value, { locale }),
      timeRange: (start: DateInput, end: DateInput) => formatTimeRange(start, end, { locale }),
      relative: (value: DateInput) => formatRelative(value, Date.now(), { locale }),
      phone: (value: string) => formatKuwaitPhone(value),
      address: (value: Address, style: 'short' | 'full' = 'short') =>
        formatAddress(value, style, locale),
      percent: (value: number) => `${Math.round(value * 100)}%`,
      number: (value: number) =>
        new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-KW').format(value),
      rating: (value: number) => (value ? value.toFixed(1) : '—'),
    }),
    [locale],
  );
}
