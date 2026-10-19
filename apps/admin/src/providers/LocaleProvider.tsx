import { brand, type Locale, type TranslateParams } from '@myhome/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type TKey, translate } from '@/i18n';
import { readPreferences, writePreferences } from '@/services/preferences';

interface LocaleContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: TKey, params?: TranslateParams) => string;
  brandName: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Language and reading direction; switching is instant (no reload). */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readPreferences().locale);
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';
  const brandName = locale === 'ar' ? brand.name_ar : brand.name;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((next: Locale) => {
    writePreferences({ locale: next });
    setLocaleState(next);
  }, []);
  const t = useCallback(
    (key: TKey, params?: TranslateParams) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, dir, setLocale, t, brandName }),
    [locale, dir, setLocale, t, brandName],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
