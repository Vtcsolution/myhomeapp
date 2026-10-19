/**
 * Single source of truth for brand identity.
 *
 * "MyHome" is a temporary name pending client approval. To rebrand, edit
 * `brand.json` (it is plain JSON so native build tooling such as the Expo app
 * config can read it too), then regenerate the app icons with
 * `python apps/mobile/scripts/build_assets.py --brand`. No other code should
 * hard-code the name, colors or contact details.
 */
import type { LocalizedText } from '../types/common';
import brandJson from './brand.json';

export interface BrandPalette {
  /** Primary brand color — deep midnight, used for headers, primary buttons. */
  primary: string;
  primaryPressed: string;
  /** Text/icon color rendered on top of `primary`. */
  onPrimary: string;
  /** Accent — champagne gold, used sparingly for highlights and premium cues. */
  accent: string;
  accentSoft: string;
  onAccent: string;
  /**
   * Accent and status colours for small text. In light mode the fills are too
   * pale for text, so these are deeper shades (WCAG AA 4.5:1 on surfaces and
   * on the soft badge tints); in dark mode they equal the fills.
   */
  accentText: string;
  /** Warm ivory app background and pure surfaces for cards. */
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successText: string;
  warning: string;
  warningText: string;
  danger: string;
  info: string;
}

export interface BrandConfig {
  name: string;
  name_ar: string;
  tagline: LocalizedText;
  legalName: string;
  /** Short monogram used where a logo image is not available. */
  monogram: string;
  support: {
    phone: string;
    whatsapp: string;
    email: string;
    hours: LocalizedText;
  };
  website: string;
  palette: {
    light: BrandPalette;
    dark: BrandPalette;
  };
  typography: {
    /** Display serif for headlines (Latin). */
    displayFamily: string;
    /** Body sans-serif (Latin). */
    bodyFamily: string;
    /** Arabic family used for both display and body when locale is `ar`. */
    arabicFamily: string;
  };
}

export const brand: BrandConfig = brandJson;
