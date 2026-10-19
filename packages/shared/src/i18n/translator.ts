/**
 * Dictionary-based translation shared by the mobile app and the admin
 * dashboard: nested dictionaries, `{name}` interpolation and CLDR plural
 * categories (Arabic uses one/two/few/many/other).
 */
import type { Locale } from '../types/common';

/** Plural forms (CLDR categories). English uses `one`/`other`; Arabic also `two`/`few`/`many`. */
export interface PluralForms {
  one: string;
  other: string;
  two?: string;
  few?: string;
  many?: string;
}

export type Leaf = string | PluralForms;
export interface Dictionary {
  [key: string]: Leaf | Dictionary;
}

/** Same shape as the English dictionary, with every leaf widened. */
export type Translations<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends PluralForms
      ? PluralForms
      : Translations<T[K]>;
};

/** Dot-separated paths to every leaf, e.g. `"auth.continue"`. */
export type TranslationKey<T> = {
  [K in keyof T & string]: T[K] extends string | PluralForms ? K : `${K}.${TranslationKey<T[K]>}`;
}[keyof T & string];

export type TranslateParams = Record<string, string | number>;

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
export function pluralCategory(count: number, locale: Locale): keyof PluralForms {
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

/**
 * Builds a typed `translate(locale, key, params)` for a pair of dictionaries.
 * Missing keys fall back to English, then to the key itself.
 */
export function createTranslator<D extends Dictionary>(dictionaries: Record<Locale, Dictionary>) {
  return (locale: Locale, key: TranslationKey<D>, params?: TranslateParams): string => {
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
  };
}
