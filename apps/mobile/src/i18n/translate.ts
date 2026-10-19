import type { Locale } from '@myhome/shared';
import { ar } from './ar';
import { en } from './en';
import type { Dictionary, Leaf, PluralForms, TranslateParams, TranslationKey } from './types';

export type TKey = TranslationKey<typeof en>;

const dictionaries: Record<Locale, Dictionary> = { en, ar };

function lookup(dict: Dictionary, key: string): Leaf | undefined {
  let node: Leaf | Dictionary | undefined = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined;
    node = (node as Dictionary)[part];
  }
  return node as Leaf | undefined;
}

function isPlural(leaf: Leaf | Dictionary): leaf is PluralForms {
  return typeof leaf === 'object' && 'other' in leaf && typeof leaf.other === 'string';
}

/** CLDR plural category for the locale. */
function pluralCategory(count: number, locale: Locale): keyof PluralForms {
  if (locale === 'ar') {
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    const mod100 = count % 100;
    if (mod100 >= 3 && mod100 <= 10) return 'few';
    if (mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  }
  return count === 1 ? 'one' : 'other';
}

export function translate(locale: Locale, key: TKey, params?: TranslateParams): string {
  const leaf = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key);
  if (leaf === undefined) return key;
  let text: string;
  if (isPlural(leaf)) {
    const count = Number(params?.count ?? 0);
    text = leaf[pluralCategory(count, locale)] ?? leaf.other;
  } else {
    text = leaf as string;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}
