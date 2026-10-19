import type { Fils, Locale } from '../types/common';
import { type DigitStyle, formatNumber, MINUS_SIGN } from './number';

export const FILS_PER_KWD = 1000;

/** Convert dinars to integer fils, e.g. `kwd(12.5)` → `12500`. */
export function kwd(amount: number): Fils {
  return Math.round(amount * FILS_PER_KWD);
}

export function filsToKwd(amount: Fils): number {
  return amount / FILS_PER_KWD;
}

export interface MoneyFormatOptions {
  locale?: Locale;
  digits?: DigitStyle;
  /** Abbreviate large values for charts and KPI tiles: "KWD 12.5K". */
  compact?: boolean;
  /** Omit the currency label. */
  hideCurrency?: boolean;
  /** Show "+" for positive amounts (wallet credits). */
  showPlusSign?: boolean;
}

const CURRENCY_LABEL: Record<Locale, string> = { en: 'KWD', ar: 'د.ك' };
const COMPACT_SUFFIX: Record<Locale, { k: string; m: string }> = {
  en: { k: 'K', m: 'M' },
  ar: { k: ' ألف', m: ' مليون' },
};

function compactNumber(dinars: number, locale: Locale, digits: DigitStyle): string {
  const abs = Math.abs(dinars);
  const suffix = COMPACT_SUFFIX[locale];
  const trim = (s: string) => s.replace(/([.٫])[0٠]$/, '');
  if (abs >= 1_000_000)
    return trim(formatNumber(abs / 1_000_000, { decimals: 1, digits })) + suffix.m;
  if (abs >= 1_000) return trim(formatNumber(abs / 1_000, { decimals: 1, digits })) + suffix.k;
  if (abs >= 100) return formatNumber(abs, { digits });
  return trim(formatNumber(abs, { decimals: 1, digits }));
}

/**
 * Kuwaiti dinar formatting with the conventional three decimals.
 * - en: `KWD 1,250.500`
 * - ar: `1,250.500 د.ك`
 */
export function formatMoney(amount: Fils, options: MoneyFormatOptions = {}): string {
  const { locale = 'en', digits = 'latin', compact = false, hideCurrency = false } = options;
  const dinars = filsToKwd(amount);
  const number = compact
    ? compactNumber(dinars, locale, digits)
    : formatNumber(Math.abs(dinars), { decimals: 3, digits });

  const sign = amount < 0 ? MINUS_SIGN : amount > 0 && options.showPlusSign ? '+' : '';
  if (hideCurrency) return `${sign}${number}`;
  return locale === 'ar'
    ? `${sign}${number} ${CURRENCY_LABEL.ar}`
    : `${sign}${CURRENCY_LABEL.en} ${number}`;
}
