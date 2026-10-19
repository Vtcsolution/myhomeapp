import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchScore } from './search';

describe('bilingual search', () => {
  it('normalises Arabic variants and diacritics', () => {
    expect(normalizeSearchText('أَلتَّكْيِيف')).toBe('التكييف');
    expect(normalizeSearchText('صيانة')).toBe('صيانه');
    expect(normalizeSearchText('Deep-Cleaning!')).toBe('deep cleaning');
    expect(normalizeSearchText('٢٠٢٦')).toBe('2026');
  });

  it('matches with and without the Arabic definite article', () => {
    expect(searchScore('تكييف', ['خدمات التكييف'])).toBeGreaterThan(0);
    expect(searchScore('التنظيف', ['تنظيف المنازل'])).toBeGreaterThan(0);
  });

  it('matches English prefixes and ranks earlier fields higher', () => {
    expect(searchScore('plumb', ['Plumbing'])).toBeGreaterThan(0);
    expect(searchScore('ac', ['AC Deep Cleaning', ''])).toBeGreaterThan(
      searchScore('ac', ['', 'AC Deep Cleaning']),
    );
  });

  it('requires every query word to match', () => {
    expect(searchScore('deep clean', ['Deep Home Cleaning'])).toBeGreaterThan(0);
    expect(searchScore('deep xyz', ['Deep Home Cleaning'])).toBe(0);
    expect(searchScore('   ', ['anything'])).toBe(0);
  });
});
