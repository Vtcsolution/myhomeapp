import type { GeoPoint, ID, LocalizedText } from './common';

export type GovernorateId =
  'capital' | 'hawalli' | 'farwaniya' | 'mubarak-al-kabeer' | 'ahmadi' | 'jahra';

export interface Governorate {
  id: GovernorateId;
  name: LocalizedText;
}

export interface Area {
  id: ID;
  governorateId: GovernorateId;
  name: LocalizedText;
  /** Approximate area centre — used for map previews and simulated tracking. */
  center: GeoPoint;
}

export type AddressLabel = 'home' | 'work' | 'other';
export type PropertyType = 'apartment' | 'house' | 'villa' | 'office';

/**
 * Kuwaiti address format: Area → Block (قطعة) → Street → Avenue/Jadda (جادة)
 * → House/Building, with optional floor, apartment and PACI number.
 */
export interface Address {
  id: ID;
  label: AddressLabel;
  /** Shown instead of the label when `label` is `other`, e.g. "Mother's house". */
  customLabel?: string;
  propertyType: PropertyType;
  areaId: ID;
  block: string;
  street: string;
  avenue?: string;
  building: string;
  floor?: string;
  apartment?: string;
  /** Kuwait PACI civil address number (optional). */
  paciNumber?: string;
  directions?: string;
  location: GeoPoint;
  isDefault: boolean;
}
