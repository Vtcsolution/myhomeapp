import type { Fils, ID, LocalizedText } from './common';
import type { CategoryIcon, MediaKey } from './media';

export interface ServiceCategory {
  id: ID;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: CategoryIcon;
  image: MediaKey;
  sortOrder: number;
  isActive: boolean;
}

/**
 * - `fixed`: one price for the job.
 * - `per_unit`: price × units (AC units, rooms, cameras…).
 * - `hourly`: price × hours.
 * - `inspection`: the base price is a visit/inspection fee; the technician
 *   quotes the repair on site as an extra charge the customer approves.
 */
export type PricingModel = 'fixed' | 'per_unit' | 'hourly' | 'inspection';

export interface ServiceOptionChoice {
  id: ID;
  label: LocalizedText;
  /**
   * Added to the base price. For `per_unit` and `hourly` services the delta is
   * applied per unit/hour; for `fixed` and `inspection` it is applied once.
   */
  priceDelta: Fils;
  durationDeltaMin: number;
}

/** A single-choice option group, e.g. "AC type" or "Property size". */
export interface ServiceOptionGroup {
  id: ID;
  label: LocalizedText;
  required: boolean;
  choices: ServiceOptionChoice[];
}

export interface ServiceAddOn {
  id: ID;
  name: LocalizedText;
  price: Fils;
  durationMin: number;
}

export interface Service {
  id: ID;
  categoryId: ID;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  image: MediaKey;
  pricingModel: PricingModel;
  basePrice: Fils;
  /** e.g. "per AC unit", "per hour". Required for `per_unit` and `hourly`. */
  unitLabel?: LocalizedText;
  minUnits: number;
  maxUnits: number;
  /** Duration of one unit (or the whole job for fixed/inspection). */
  durationMin: number;
  optionGroups: ServiceOptionGroup[];
  addOns: ServiceAddOn[];
  includes: LocalizedText[];
  excludes: LocalizedText[];
  warrantyDays: number;
  /** Aggregates — derived from reviews and bookings. */
  rating: number;
  reviewsCount: number;
  bookingsCount: number;
  isPopular: boolean;
  isActive: boolean;
}

export interface Promotion {
  id: ID;
  title: LocalizedText;
  subtitle: LocalizedText;
  image: MediaKey;
  ctaLabel: LocalizedText;
  target: { type: 'category' | 'service'; id: ID };
  couponCode?: string;
  validUntil: string;
}
