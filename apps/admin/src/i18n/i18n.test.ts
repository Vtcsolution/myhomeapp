import { describe, expect, it } from 'vitest';
import { ar } from './ar';
import { en } from './en';
import { translate } from './index';

function leaves(dict: object, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const isPlural =
      typeof value === 'object' && 'other' in value && typeof value.other === 'string';
    return typeof value === 'string' || isPlural ? [path] : leaves(value as object, path);
  });
}

describe('dashboard translations', () => {
  it('Arabic covers every English key', () => {
    expect(leaves(ar).sort()).toEqual(leaves(en).sort());
  });

  it('uses Arabic plural forms', () => {
    expect(translate('ar', 'zones.areas', { count: 2 })).toBe('منطقتان');
    expect(translate('en', 'zones.areas', { count: 1 })).toBe('1 area');
  });

  it('keeps placeholders in both languages', () => {
    for (const key of leaves(en)) {
      const enText = JSON.stringify(
        key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], en),
      );
      const arText = JSON.stringify(
        key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], ar),
      );
      const names = (s: string) =>
        [...new Set(s.match(/\{[a-zA-Z]+\}/g) ?? [])].filter((p) => p !== '{count}').sort();
      expect({ key, placeholders: names(arText) }).toEqual({ key, placeholders: names(enText) });
    }
  });
});
