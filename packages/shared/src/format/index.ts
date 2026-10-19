export * from './number';
export * from './money';
export * from './phone';
export * from './datetime';
export * from './address';
export * from './bidi';

import type { Locale, LocalizedText } from '../types/common';

/** Pick the string for the active locale, falling back to English. */
export function t(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.en;
}
