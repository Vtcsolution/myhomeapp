import {
  createTranslator,
  type Locale,
  type TranslateParams,
  type TranslationKey,
} from '@myhome/shared';
import { ar } from './ar';
import { en } from './en';

export type TKey = TranslationKey<typeof en>;

export const translate: (locale: Locale, key: TKey, params?: TranslateParams) => string =
  createTranslator<typeof en>({ en, ar });
