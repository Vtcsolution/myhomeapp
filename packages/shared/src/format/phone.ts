import { type DigitStyle, formatDigits, toLatinDigits } from './number';

export const KUWAIT_DIAL_CODE = '+965';

/** Kuwaiti mobile numbers are 8 digits starting with 4, 5, 6 or 9. */
const MOBILE_PATTERN = /^[4569]\d{7}$/;
/** Any Kuwaiti subscriber number (landlines start with 2). */
const SUBSCRIBER_PATTERN = /^[24569]\d{7}$/;

/**
 * Normalises user input to E.164 (`+965XXXXXXXX`). Accepts local 8-digit
 * numbers, `+965`, `00965` and `965` prefixes, spaces, dashes, parentheses and
 * Arabic-Indic digits. Returns `null` when the input is not a Kuwaiti number.
 */
export function normalizeKuwaitPhone(input: string): string | null {
  let digits = toLatinDigits(input).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+965')) digits = digits.slice(4);
  else if (digits.startsWith('00965')) digits = digits.slice(5);
  else if (digits.startsWith('965') && digits.length === 11) digits = digits.slice(3);
  if (!SUBSCRIBER_PATTERN.test(digits)) return null;
  return `${KUWAIT_DIAL_CODE}${digits}`;
}

export function isValidKuwaitMobile(input: string): boolean {
  const normalized = normalizeKuwaitPhone(input);
  return normalized !== null && MOBILE_PATTERN.test(normalized.slice(4));
}

/** `+96555550101` → `+965 5555 0101`. Unrecognised input is returned unchanged. */
export function formatKuwaitPhone(input: string, digits: DigitStyle = 'latin'): string {
  const normalized = normalizeKuwaitPhone(input);
  if (!normalized) return input;
  const local = normalized.slice(4);
  return formatDigits(`${KUWAIT_DIAL_CODE} ${local.slice(0, 4)} ${local.slice(4)}`, digits);
}

/** `+96555550101` → `+965 •••• 0101` — for OTP screens and admin lists. */
export function maskKuwaitPhone(input: string): string {
  const normalized = normalizeKuwaitPhone(input);
  if (!normalized) return input;
  return `${KUWAIT_DIAL_CODE} •••• ${normalized.slice(-4)}`;
}
