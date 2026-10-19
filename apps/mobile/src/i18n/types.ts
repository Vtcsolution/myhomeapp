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
