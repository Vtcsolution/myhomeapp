/**
 * Date/time formatting in Kuwait time for English and Arabic, including
 * correct Arabic plural forms (singular / dual / 3–10 plural / 11+ singular).
 */
import {
  type DateInput,
  DAY_MS,
  daysBetweenLocalDates,
  HOUR_MS,
  kuwaitDateOf,
  MINUTE_MS,
  toKuwaitParts,
  toMs,
  weekdayOfLocalDate,
} from '../domain/time';
import type { Locale, LocalDate } from '../types/common';
import { type DigitStyle, formatDigits } from './number';

const MONTHS: Record<Locale, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  ar: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
};

const WEEKDAYS: Record<Locale, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

export function monthName(month: number, locale: Locale, short = false): string {
  const name = MONTHS[locale][month - 1] ?? '';
  return short && locale === 'en' ? name.slice(0, 3) : name;
}

export function weekdayName(weekday: number, locale: Locale, short = false): string {
  const name = WEEKDAYS[locale][weekday] ?? '';
  return short && locale === 'en' ? name.slice(0, 3) : name;
}

export interface DateTimeFormatOptions {
  locale?: Locale;
  digits?: DigitStyle;
}

export type DateStyle = 'numeric' | 'medium' | 'long' | 'full' | 'dayMonth';

/**
 * - numeric: `19/10/2026`
 * - medium: `19 Oct 2026` / `19 أكتوبر 2026`
 * - long: `19 October 2026`
 * - full: `Monday, 19 October 2026` / `الاثنين، 19 أكتوبر 2026`
 * - dayMonth: `Mon, 19 Oct` / `الاثنين، 19 أكتوبر`
 */
export function formatDate(
  input: DateInput,
  style: DateStyle = 'medium',
  options: DateTimeFormatOptions = {},
): string {
  const { locale = 'en', digits = 'latin' } = options;
  const p = toKuwaitParts(input);
  const comma = locale === 'ar' ? '،' : ',';
  let out: string;
  switch (style) {
    case 'numeric':
      out = `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
      break;
    case 'medium':
      out = `${p.day} ${monthName(p.month, locale, true)} ${p.year}`;
      break;
    case 'long':
      out = `${p.day} ${monthName(p.month, locale)} ${p.year}`;
      break;
    case 'full':
      out = `${weekdayName(p.weekday, locale)}${comma} ${p.day} ${monthName(p.month, locale)} ${p.year}`;
      break;
    case 'dayMonth':
      out = `${weekdayName(p.weekday, locale, true)}${comma} ${p.day} ${monthName(p.month, locale, true)}`;
      break;
  }
  return formatDigits(out, digits);
}

/** `10:00 AM` / `10:00 ص` */
export function formatTime(input: DateInput, options: DateTimeFormatOptions = {}): string {
  const { locale = 'en', digits = 'latin' } = options;
  const { hour, minute } = toKuwaitParts(input);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const isAm = hour < 12;
  const suffix = locale === 'ar' ? (isAm ? 'ص' : 'م') : isAm ? 'AM' : 'PM';
  return formatDigits(`${h12}:${String(minute).padStart(2, '0')} ${suffix}`, digits);
}

export function formatTimeRange(
  start: DateInput,
  end: DateInput,
  options: DateTimeFormatOptions = {},
): string {
  return `${formatTime(start, options)} – ${formatTime(end, options)}`;
}

interface ArabicForms {
  one: string;
  /** Dual in nominative case (for standalone durations). */
  two: string;
  /** Dual in genitive case (after a preposition such as "منذ"). */
  twoGenitive: string;
  few: string;
  many: string;
}

const AR_UNITS = {
  minute: { one: 'دقيقة', two: 'دقيقتان', twoGenitive: 'دقيقتين', few: 'دقائق', many: 'دقيقة' },
  hour: { one: 'ساعة', two: 'ساعتان', twoGenitive: 'ساعتين', few: 'ساعات', many: 'ساعة' },
  day: { one: 'يوم', two: 'يومان', twoGenitive: 'يومين', few: 'أيام', many: 'يوماً' },
} satisfies Record<string, ArabicForms>;

/** Arabic counted noun: 1 → "ساعة", 2 → "ساعتان", 3 → "3 ساعات", 11 → "11 ساعة". */
export function arabicCount(
  n: number,
  forms: ArabicForms,
  { genitive = false, digits = 'latin' as DigitStyle } = {},
): string {
  if (n === 1) return forms.one;
  if (n === 2) return genitive ? forms.twoGenitive : forms.two;
  const mod100 = n % 100;
  const noun = mod100 >= 3 && mod100 <= 10 ? forms.few : forms.many;
  return `${formatDigits(n, digits)} ${noun}`;
}

const EN_UNITS = {
  minute: ['min', 'min'],
  hour: ['hr', 'hrs'],
  day: ['day', 'days'],
} as const;

function enCount(n: number, unit: keyof typeof EN_UNITS): string {
  return `${n} ${EN_UNITS[unit][n === 1 ? 0 : 1]}`;
}

/** `1 hr 30 min` / `ساعة و30 دقيقة` */
export function formatDuration(minutes: number, options: DateTimeFormatOptions = {}): string {
  const { locale = 'en', digits = 'latin' } = options;
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (locale === 'ar') {
    const parts: string[] = [];
    if (h) parts.push(arabicCount(h, AR_UNITS.hour, { digits }));
    if (m || !h) parts.push(arabicCount(m, AR_UNITS.minute, { digits }));
    return parts.join(' و');
  }
  const parts: string[] = [];
  if (h) parts.push(enCount(h, 'hour'));
  if (m || !h) parts.push(enCount(m, 'minute'));
  return formatDigits(parts.join(' '), digits);
}

/** "just now", "5 min ago", "yesterday", then the date. */
export function formatRelative(
  input: DateInput,
  now: DateInput,
  options: DateTimeFormatOptions = {},
): string {
  const { locale = 'en', digits = 'latin' } = options;
  const diff = toMs(now) - toMs(input);
  const ar = locale === 'ar';

  if (diff < MINUTE_MS) return ar ? 'الآن' : 'just now';
  if (diff < HOUR_MS) {
    const n = Math.floor(diff / MINUTE_MS);
    return ar
      ? `منذ ${arabicCount(n, AR_UNITS.minute, { genitive: true, digits })}`
      : formatDigits(`${enCount(n, 'minute')} ago`, digits);
  }
  const dayGap = daysBetweenLocalDates(kuwaitDateOf(input), kuwaitDateOf(now));
  if (diff < DAY_MS && dayGap === 0) {
    const n = Math.floor(diff / HOUR_MS);
    return ar
      ? `منذ ${arabicCount(n, AR_UNITS.hour, { genitive: true, digits })}`
      : formatDigits(`${enCount(n, 'hour')} ago`, digits);
  }
  if (dayGap === 1) return ar ? 'أمس' : 'yesterday';
  if (dayGap < 7) {
    return ar
      ? `منذ ${arabicCount(dayGap, AR_UNITS.day, { genitive: true, digits })}`
      : formatDigits(`${enCount(dayGap, 'day')} ago`, digits);
  }
  return formatDate(input, 'medium', options);
}

/** Label for a date chip: "Today", "Tomorrow", or the short weekday. */
export function formatDayLabel(date: LocalDate, today: LocalDate, locale: Locale = 'en'): string {
  const gap = daysBetweenLocalDates(today, date);
  if (gap === 0) return locale === 'ar' ? 'اليوم' : 'Today';
  if (gap === 1) return locale === 'ar' ? 'غداً' : 'Tomorrow';
  return weekdayName(weekdayOfLocalDate(date), locale, true);
}
