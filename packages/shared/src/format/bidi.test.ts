import { describe, expect, it } from 'vitest';
import { hasIsolates, isolateLtrRuns } from './bidi';
import { formatMoney } from './money';
import { formatKuwaitPhone, maskKuwaitPhone } from './phone';

const iso = (s: string) => `\u2066${s}\u2069`;

describe('Latin runs inside Arabic text', () => {
  it('isolates phone numbers, masked numbers and booking references', () => {
    expect(isolateLtrRuns(formatKuwaitPhone('55550101'))).toBe(iso('+965 5555 0101'));
    expect(isolateLtrRuns(`أرسلنا رمزاً إلى ${maskKuwaitPhone('60001001')}`)).toBe(
      `أرسلنا رمزاً إلى ${iso('+965 •••• 1001')}`,
    );
    expect(isolateLtrRuns('تكييف · MH-48652')).toBe(`تكييف · ${iso('MH-48652')}`);
    expect(isolateLtrRuns('T-10425 · قبل ساعة')).toBe(`${iso('T-10425')} · قبل ساعة`);
  });

  it('leaves money, dates, times, short numbers and plain words untouched', () => {
    for (const text of [
      formatMoney(40_800, { locale: 'ar' }),
      'الاثنين، 19 أكتوبر 2026',
      '8:00 ص – 10:00 ص',
      '4.4 (24)',
      'COOL25',
      'Rajesh Kumar',
    ]) {
      expect(isolateLtrRuns(text)).toBe(text);
    }
  });

  it('never wraps twice', () => {
    const once = isolateLtrRuns('+965 5555 0101');
    expect(hasIsolates(once)).toBe(true);
    expect(isolateLtrRuns(once)).toBe(once);
  });
});
