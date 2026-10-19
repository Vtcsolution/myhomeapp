/**
 * Number formatting without `Intl`, so output is identical on every JS engine
 * (Hermes, V8, JavaScriptCore). Kuwaiti apps commonly show Western ("latin")
 * digits even in Arabic UI; Arabic-Indic digits are available as an option.
 */
export type DigitStyle = 'latin' | 'arabic';

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicIndicDigits(value: string): string {
  return value.replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
}

export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export interface NumberFormatOptions {
  decimals?: number;
  digits?: DigitStyle;
  /** Group thousands (default true). */
  grouping?: boolean;
}

export const MINUS_SIGN = '\u2212';

export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const { decimals = 0, digits = 'latin', grouping = true } = options;
  const negative = value < 0 && Math.abs(value) >= 0.5 * 10 ** -decimals;
  const [intPart = '0', fracPart] = Math.abs(value).toFixed(decimals).split('.');
  const groupedInt = grouping ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : intPart;
  let out = fracPart ? `${groupedInt}.${fracPart}` : groupedInt;
  if (digits === 'arabic') {
    out = toArabicIndicDigits(out).replace(/,/g, '٬').replace(/\./g, '٫');
  }
  return negative ? `${MINUS_SIGN}${out}` : out;
}

/** Formats a number using only digits of the chosen style (no grouping). */
export function formatDigits(value: number | string, digits: DigitStyle = 'latin'): string {
  const s = String(value);
  return digits === 'arabic' ? toArabicIndicDigits(s) : s;
}
