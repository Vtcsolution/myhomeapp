import { createTranslator, type Locale } from '@myhome/shared';
import { ar } from './ar';
import { en } from './en';
import type { TranslationKey } from './types';

export type TKey = TranslationKey<typeof en>;

/** Typed translator over the app dictionaries (core shared with the admin dashboard). */
export const translate: (
  locale: Locale,
  key: TKey,
  params?: Record<string, string | number>,
) => string = createTranslator<typeof en>({ en, ar });
