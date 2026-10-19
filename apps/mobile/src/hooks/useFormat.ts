import {
  type Address,
  type AddressStyle,
  type DateInput,
  type DateStyle,
  formatAddress,
  formatDate,
  formatDuration,
  formatKuwaitPhone,
  formatMoney,
  formatRelative,
  formatTime,
  formatTimeRange,
  type Fils,
  type LocalizedText,
  t as pickLocalized,
} from '@myhome/shared';
import { useMemo } from 'react';
import { useLocale } from '@/providers/LocaleProvider';

/** Shared formatters bound to the active language. */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      text: (value: LocalizedText) => pickLocalized(value, locale),
      money: (amount: Fils, options?: { compact?: boolean; showPlusSign?: boolean }) =>
        formatMoney(amount, { locale, ...options }),
      date: (value: DateInput, style: DateStyle = 'medium') => formatDate(value, style, { locale }),
      time: (value: DateInput) => formatTime(value, { locale }),
      timeRange: (start: DateInput, end: DateInput) => formatTimeRange(start, end, { locale }),
      relative: (value: DateInput) => formatRelative(value, Date.now(), { locale }),
      duration: (minutes: number) => formatDuration(minutes, { locale }),
      phone: (value: string) => formatKuwaitPhone(value),
      address: (value: Address, style: AddressStyle = 'short') =>
        formatAddress(value, style, locale),
      rating: (value: number) => value.toFixed(1),
      percent: (value: number) => `${Math.round(value * 100)}%`,
    }),
    [locale],
  );
}
