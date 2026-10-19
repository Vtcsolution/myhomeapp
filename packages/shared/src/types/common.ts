/** Opaque string identifier. */
export type ID = string;

/** UTC timestamp in ISO-8601 format, e.g. `2026-10-19T07:00:00.000Z`. */
export type ISODateTime = string;

/** Calendar date in Kuwait local time, `YYYY-MM-DD`. */
export type LocalDate = string;

export type Locale = 'en' | 'ar';

export interface LocalizedText {
  en: string;
  ar: string;
}

/**
 * Monetary amount in fils (1 KWD = 1000 fils). Always an integer — never use
 * floating-point dinars for arithmetic.
 */
export type Fils = number;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortDirection = 'asc' | 'desc';
