import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { readPreferences, type ThemePreference, writePreferences } from '@/services/preferences';
import { applyTheme, type ColorScheme } from '@/theme/tokens';

interface ThemeContextValue {
  preference: ThemePreference;
  scheme: ColorScheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const systemScheme = (): ColorScheme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

/** Light, dark or follow the system — the same palette as the mobile apps. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreferences().theme);
  const [system, setSystem] = useState<ColorScheme>(systemScheme);
  const scheme = preference === 'system' ? system : preference;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => applyTheme(scheme), [scheme]);

  const value = useMemo(
    () => ({
      preference,
      scheme,
      setPreference: (next: ThemePreference) => {
        writePreferences({ theme: next });
        setPreferenceState(next);
      },
    }),
    [preference, scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
