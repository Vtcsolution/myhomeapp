import { describe, expect, it } from 'vitest';
import type { Address } from '../types';
import {
  arabicCount,
  formatAddress,
  formatDate,
  formatDayLabel,
  formatDuration,
  formatKuwaitPhone,
  formatMoney,
  formatNumber,
  formatRelative,
  formatTime,
  formatTimeRange,
  isValidKuwaitMobile,
  kwd,
  maskKuwaitPhone,
  normalizeKuwaitPhone,
  toArabicIndicDigits,
  toLatinDigits,
} from './index';

// Monday 19 October 2026, 10:30 in Kuwait (UTC+3).
const NOW = '2026-10-19T07:30:00.000Z';
const MIN = 60_000;

describe('numbers', () => {
  it('groups thousands and fixes decimals', () => {
    expect(formatNumber(1234567.891, { decimals: 2 })).toBe('1,234,567.89');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1500)).toBe('−1,500');
  });

  it('converts between digit systems', () => {
    expect(toArabicIndicDigits('2026')).toBe('٢٠٢٦');
    expect(toLatinDigits('٢٠٢٦ ۱۲')).toBe('2026 12');
    expect(formatNumber(1250.5, { decimals: 3, digits: 'arabic' })).toBe('١٬٢٥٠٫٥٠٠');
  });
});

describe('money (KWD, 3 decimals)', () => {
  it('converts dinars to integer fils without float drift', () => {
    expect(kwd(12.5)).toBe(12_500);
    expect(kwd(0.1 + 0.2)).toBe(300);
  });

  it('formats English and Arabic', () => {
    expect(formatMoney(12_500)).toBe('KWD 12.500');
    expect(formatMoney(1_250_500)).toBe('KWD 1,250.500');
    expect(formatMoney(12_500, { locale: 'ar' })).toBe('12.500 د.ك');
    expect(formatMoney(12_500, { locale: 'ar', digits: 'arabic' })).toBe('١٢٫٥٠٠ د.ك');
  });

  it('handles signs', () => {
    expect(formatMoney(-3_000)).toBe('−KWD 3.000');
    expect(formatMoney(5_000, { showPlusSign: true })).toBe('+KWD 5.000');
    expect(formatMoney(0, { showPlusSign: true })).toBe('KWD 0.000');
    expect(formatMoney(-3_000, { locale: 'ar' })).toBe('−3.000 د.ك');
  });

  it('abbreviates for charts', () => {
    expect(formatMoney(12_500_000, { compact: true })).toBe('KWD 12.5K');
    expect(formatMoney(1_000_000, { compact: true })).toBe('KWD 1K');
    expect(formatMoney(2_400_000_000, { compact: true })).toBe('KWD 2.4M');
    expect(formatMoney(450_000, { compact: true })).toBe('KWD 450');
    expect(formatMoney(12_500_000, { compact: true, locale: 'ar' })).toBe('12.5 ألف د.ك');
    expect(formatMoney(12_500, { hideCurrency: true })).toBe('12.500');
  });
});

describe('Kuwaiti phone numbers', () => {
  it.each([
    '55550101',
    '5555 0101',
    '+965 5555-0101',
    '0096555550101',
    '96555550101',
    '(+965) 5555 0101',
    '٥٥٥٥٠١٠١',
  ])('normalises %s', (input) => {
    expect(normalizeKuwaitPhone(input)).toBe('+96555550101');
  });

  it('rejects numbers that are not Kuwaiti', () => {
    expect(normalizeKuwaitPhone('12345678')).toBeNull();
    expect(normalizeKuwaitPhone('5555010')).toBeNull();
    expect(normalizeKuwaitPhone('+971501234567')).toBeNull();
  });

  it('distinguishes mobiles from landlines', () => {
    expect(isValidKuwaitMobile('99887766')).toBe(true);
    expect(isValidKuwaitMobile('41234567')).toBe(true);
    expect(isValidKuwaitMobile('22410870')).toBe(false);
    expect(normalizeKuwaitPhone('22410870')).toBe('+96522410870');
  });

  it('formats and masks', () => {
    expect(formatKuwaitPhone('+96555550101')).toBe('+965 5555 0101');
    expect(formatKuwaitPhone('55550101', 'arabic')).toBe('+٩٦٥ ٥٥٥٥ ٠١٠١');
    expect(formatKuwaitPhone('not a number')).toBe('not a number');
    expect(maskKuwaitPhone('+96555550101')).toBe('+965 •••• 0101');
  });
});

describe('dates and times in Kuwait time', () => {
  it('formats dates in both languages', () => {
    expect(formatDate(NOW, 'numeric')).toBe('19/10/2026');
    expect(formatDate(NOW, 'medium')).toBe('19 Oct 2026');
    expect(formatDate(NOW, 'long')).toBe('19 October 2026');
    expect(formatDate(NOW, 'full')).toBe('Monday, 19 October 2026');
    expect(formatDate(NOW, 'dayMonth')).toBe('Mon, 19 Oct');
    expect(formatDate(NOW, 'medium', { locale: 'ar' })).toBe('19 أكتوبر 2026');
    expect(formatDate(NOW, 'full', { locale: 'ar' })).toBe('الاثنين، 19 أكتوبر 2026');
  });

  it('uses Kuwait time regardless of the UTC date', () => {
    const lateUtc = '2026-10-19T22:30:00.000Z'; // 01:30 on 20 Oct in Kuwait
    expect(formatDate(lateUtc, 'medium')).toBe('20 Oct 2026');
    expect(formatTime(lateUtc)).toBe('1:30 AM');
  });

  it('formats 12-hour times with Arabic suffixes', () => {
    expect(formatTime(NOW)).toBe('10:30 AM');
    expect(formatTime(NOW, { locale: 'ar' })).toBe('10:30 ص');
    expect(formatTime('2026-10-19T09:00:00.000Z')).toBe('12:00 PM');
    expect(formatTime('2026-10-18T21:00:00.000Z')).toBe('12:00 AM');
    expect(
      formatTimeRange('2026-10-19T11:00:00.000Z', '2026-10-19T13:00:00.000Z', { locale: 'ar' }),
    ).toBe('2:00 م – 4:00 م');
  });

  it('formats durations with correct Arabic plurals', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(120)).toBe('2 hrs');
    expect(formatDuration(45, { locale: 'ar' })).toBe('45 دقيقة');
    expect(formatDuration(90, { locale: 'ar' })).toBe('ساعة و30 دقيقة');
    expect(formatDuration(120, { locale: 'ar' })).toBe('ساعتان');
    expect(formatDuration(180, { locale: 'ar' })).toBe('3 ساعات');
    expect(formatDuration(660, { locale: 'ar' })).toBe('11 ساعة');
  });

  it('applies Arabic counting rules', () => {
    const day = { one: 'يوم', two: 'يومان', twoGenitive: 'يومين', few: 'أيام', many: 'يوماً' };
    expect(arabicCount(1, day)).toBe('يوم');
    expect(arabicCount(2, day)).toBe('يومان');
    expect(arabicCount(2, day, { genitive: true })).toBe('يومين');
    expect(arabicCount(7, day)).toBe('7 أيام');
    expect(arabicCount(11, day)).toBe('11 يوماً');
    expect(arabicCount(103, day)).toBe('103 أيام');
  });

  it('formats relative times', () => {
    const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
    expect(formatRelative(ago(30_000), NOW)).toBe('just now');
    expect(formatRelative(ago(30_000), NOW, { locale: 'ar' })).toBe('الآن');
    expect(formatRelative(ago(5 * MIN), NOW)).toBe('5 min ago');
    expect(formatRelative(ago(5 * MIN), NOW, { locale: 'ar' })).toBe('منذ 5 دقائق');
    expect(formatRelative(ago(2 * MIN), NOW, { locale: 'ar' })).toBe('منذ دقيقتين');
    expect(formatRelative(ago(1 * MIN), NOW, { locale: 'ar' })).toBe('منذ دقيقة');
    expect(formatRelative(ago(3 * 60 * MIN), NOW)).toBe('3 hrs ago');
    expect(formatRelative(ago(24 * 60 * MIN), NOW)).toBe('yesterday');
    expect(formatRelative(ago(3 * 24 * 60 * MIN), NOW)).toBe('3 days ago');
    expect(formatRelative(ago(3 * 24 * 60 * MIN), NOW, { locale: 'ar' })).toBe('منذ 3 أيام');
    expect(formatRelative(ago(10 * 24 * 60 * MIN), NOW)).toBe('9 Oct 2026');
  });

  it('labels days for date pickers', () => {
    expect(formatDayLabel('2026-10-19', '2026-10-19')).toBe('Today');
    expect(formatDayLabel('2026-10-20', '2026-10-19')).toBe('Tomorrow');
    expect(formatDayLabel('2026-10-21', '2026-10-19')).toBe('Wed');
    expect(formatDayLabel('2026-10-20', '2026-10-19', 'ar')).toBe('غداً');
    expect(formatDayLabel('2026-10-21', '2026-10-19', 'ar')).toBe('الأربعاء');
  });
});

describe('Kuwaiti addresses', () => {
  const villa: Address = {
    id: 'a1',
    label: 'home',
    propertyType: 'villa',
    areaId: 'salwa',
    block: '4',
    street: '12',
    avenue: '3',
    building: '27',
    location: { lat: 29.29, lng: 48.07 },
    isDefault: true,
  };
  const apartment: Address = {
    ...villa,
    propertyType: 'apartment',
    areaId: 'salmiya',
    block: '10',
    street: 'Baghdad St',
    building: '33',
    floor: '6',
    apartment: '62',
  };
  delete (apartment as Partial<Address>).avenue;

  it('formats short, line and full styles', () => {
    expect(formatAddress(villa, 'short')).toBe('Salwa, Block 4');
    expect(formatAddress(villa, 'line')).toBe('Block 4, Street 12, Avenue 3, Villa 27');
    expect(formatAddress(villa, 'full')).toBe(
      'Salwa, Block 4, Street 12, Avenue 3, Villa 27, Hawalli',
    );
    expect(formatAddress(villa, 'full', 'ar')).toBe('سلوى، قطعة 4، شارع 12، جادة 3، فيلا 27، حولي');
  });

  it('keeps named streets and includes floor and apartment', () => {
    expect(formatAddress(apartment, 'full')).toBe(
      'Salmiya, Block 10, Baghdad St, Building 33, Floor 6, Apt 62, Hawalli',
    );
  });
});
