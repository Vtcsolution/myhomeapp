/**
 * Single source of truth for brand identity.
 *
 * "MyHome" is a temporary name pending client approval. To rebrand, edit this
 * file (and replace the logo assets referenced by each app) — no other code
 * should hard-code the name, colors or contact details.
 */
import type { LocalizedText } from '../types/common';

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
  /** Warm ivory app background and pure surfaces for cards. */
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
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

export const brand: BrandConfig = {
  name: 'MyHome',
  name_ar: 'ماي هوم',
  tagline: {
    en: 'Exceptional care for your home',
    ar: 'عناية استثنائية بمنزلك',
  },
  legalName: 'MyHome Home Services (Demo)',
  monogram: 'MH',
  support: {
    phone: '+96518000000',
    whatsapp: '+96550000000',
    email: 'care@myhome.demo',
    hours: {
      en: 'Every day, 8:00 AM – 10:00 PM',
      ar: 'يومياً، من ٨ صباحاً حتى ١٠ مساءً',
    },
  },
  website: 'https://myhome.demo',
  palette: {
    light: {
      primary: '#0F1D2B',
      primaryPressed: '#1A2C3E',
      onPrimary: '#FBF8F3',
      accent: '#B8935A',
      accentSoft: '#F3EADB',
      onAccent: '#1B1408',
      background: '#F8F5F0',
      surface: '#FFFFFF',
      surfaceMuted: '#F1ECE4',
      border: '#E6DFD4',
      textPrimary: '#141A21',
      textSecondary: '#4A5360',
      textMuted: '#8A919B',
      success: '#2E7D5B',
      warning: '#B7791F',
      danger: '#B3423A',
      info: '#2F5D8A',
    },
    dark: {
      primary: '#D9BC8A',
      primaryPressed: '#C8A877',
      onPrimary: '#12100C',
      accent: '#D9BC8A',
      accentSoft: '#2A2418',
      onAccent: '#12100C',
      background: '#0B1219',
      surface: '#121C26',
      surfaceMuted: '#18242F',
      border: '#243341',
      textPrimary: '#F3EFE8',
      textSecondary: '#B9C0C8',
      textMuted: '#7D8792',
      success: '#5BB38B',
      warning: '#E0A94A',
      danger: '#E07A70',
      info: '#7AA6D1',
    },
  },
  typography: {
    displayFamily: 'Fraunces',
    bodyFamily: 'Manrope',
    arabicFamily: 'IBM Plex Sans Arabic',
  },
};
