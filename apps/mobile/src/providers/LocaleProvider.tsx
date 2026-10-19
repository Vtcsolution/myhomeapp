import { brand, type Locale } from '@myhome/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { translate, type TKey } from '@/i18n/translate';
import type { TranslateParams } from '@/i18n/types';
import { readPreferences, writePreferences } from '@/services/preferences';

export type { Direction } from '@/theme/direction';
import type { Direction } from '@/theme/direction';

interface LocaleContextValue {
  locale: Locale;
  direction: Direction;
  isRTL: boolean;
  /** Brand name in the active language (from the brand config). */
  brandName: string;
  setLocale: (locale: Locale) => void;
  t: (key: TKey, params?: TranslateParams) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * English is the default. Switching language is instant: navigation receives
 * the direction through Expo Router's `LocaleProvider`, and app content through
 * the root view's `direction` style (see RootLayout). No reload is required,
 * which also keeps Arabic working inside Expo Go.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readPreferences().locale);
  const direction: Direction = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  const setLocale = useCallback((next: Locale) => {
    writePreferences({ locale: next });
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction,
      isRTL: direction === 'rtl',
      brandName: locale === 'ar' ? brand.name_ar : brand.name,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, direction, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
