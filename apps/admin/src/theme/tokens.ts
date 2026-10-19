/**
 * Colour tokens come from the shared brand palette (`brand.json`), so a
 * rebrand needs no CSS changes. They are applied as CSS custom properties.
 */
import { brand, type BrandPalette } from '@myhome/shared';

export type ColorScheme = 'light' | 'dark';

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function cssVariables(scheme: ColorScheme): Record<string, string> {
  const palette: BrandPalette = brand.palette[scheme];
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) vars[`--${kebab(key)}`] = value;
  // Fixed brand tones that do not change with the scheme.
  vars['--midnight'] = brand.palette.light.primary;
  vars['--champagne'] = brand.palette.dark.accent;
  vars['--on-midnight'] = brand.palette.light.onPrimary;
  vars['--hairline'] = scheme === 'light' ? 'rgba(20, 26, 33, 0.08)' : 'rgba(243, 239, 232, 0.09)';
  vars['--shadow'] =
    scheme === 'light'
      ? '0 1px 2px rgba(15, 29, 43, 0.04), 0 8px 24px rgba(15, 29, 43, 0.05)'
      : '0 1px 2px rgba(0, 0, 0, 0.3)';
  vars['--skeleton'] = scheme === 'light' ? '#ECE6DC' : '#1D2A36';
  return vars;
}

export function applyTheme(scheme: ColorScheme): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(cssVariables(scheme)))
    root.style.setProperty(name, value);
  root.dataset.theme = scheme;
  root.style.colorScheme = scheme;
}
