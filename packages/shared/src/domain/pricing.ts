import { type BusinessConfig, businessConfig } from '../brand/business.config';
import type {
  BookingSelections,
  ExtraCharge,
  PriceBreakdown,
  PriceLineItem,
} from '../types/booking';
import type { Service } from '../types/catalog';
import type { Fils, ISODateTime } from '../types/common';
import type { Coupon } from '../types/engagement';
import { toMs } from './time';

export type SelectionIssue =
  | { code: 'units_out_of_range'; min: number; max: number }
  | { code: 'missing_required_option'; groupId: string }
  | { code: 'unknown_option_group'; groupId: string }
  | { code: 'unknown_option_choice'; groupId: string; choiceId: string }
  | { code: 'unknown_add_on'; addOnId: string }
  | { code: 'duplicate_add_on'; addOnId: string };

export function isUnitPriced(service: Service): boolean {
  return service.pricingModel === 'per_unit' || service.pricingModel === 'hourly';
}

export function validateSelections(
  service: Service,
  selections: BookingSelections,
): SelectionIssue[] {
  const issues: SelectionIssue[] = [];
  const { units } = selections;
  const min = isUnitPriced(service) ? service.minUnits : 1;
  const max = isUnitPriced(service) ? service.maxUnits : 1;
  if (!Number.isInteger(units) || units < min || units > max) {
    issues.push({ code: 'units_out_of_range', min, max });
  }
  for (const [groupId, choiceId] of Object.entries(selections.options)) {
    const group = service.optionGroups.find((g) => g.id === groupId);
    if (!group) issues.push({ code: 'unknown_option_group', groupId });
    else if (!group.choices.some((c) => c.id === choiceId)) {
      issues.push({ code: 'unknown_option_choice', groupId, choiceId });
    }
  }
  for (const group of service.optionGroups) {
    if (group.required && !selections.options[group.id]) {
      issues.push({ code: 'missing_required_option', groupId: group.id });
    }
  }
  const seen = new Set<string>();
  for (const addOnId of selections.addOnIds) {
    if (seen.has(addOnId)) issues.push({ code: 'duplicate_add_on', addOnId });
    seen.add(addOnId);
    if (!service.addOns.some((a) => a.id === addOnId))
      issues.push({ code: 'unknown_add_on', addOnId });
  }
  return issues;
}

/** Default selections: minimum units and the first choice of every required group. */
export function defaultSelections(service: Service): BookingSelections {
  const options: Record<string, string> = {};
  for (const group of service.optionGroups) {
    const first = group.choices[0];
    if (group.required && first) options[group.id] = first.id;
  }
  return { options, addOnIds: [], units: isUnitPriced(service) ? service.minUnits : 1 };
}

export function couponDiscount(coupon: Coupon, subtotal: Fils): Fils {
  const raw =
    coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  const capped = coupon.maxDiscount !== undefined ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

export type CouponRejection =
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit_reached'
  | 'min_subtotal_not_met'
  | 'category_not_eligible'
  | 'first_booking_only';

export interface CouponContext {
  subtotal: Fils;
  categoryId: string;
  now: ISODateTime;
  /** Bookings the customer has made before (any non-cancelled status). */
  previousBookings: number;
}

export function evaluateCoupon(
  coupon: Coupon,
  ctx: CouponContext,
): { ok: true; discount: Fils } | { ok: false; reason: CouponRejection } {
  const now = toMs(ctx.now);
  if (!coupon.isActive) return { ok: false, reason: 'inactive' };
  if (now < toMs(coupon.validFrom)) return { ok: false, reason: 'not_started' };
  if (now > toMs(coupon.validUntil)) return { ok: false, reason: 'expired' };
  if (coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: 'usage_limit_reached' };
  if (coupon.categoryIds.length && !coupon.categoryIds.includes(ctx.categoryId)) {
    return { ok: false, reason: 'category_not_eligible' };
  }
  if (coupon.firstBookingOnly && ctx.previousBookings > 0) {
    return { ok: false, reason: 'first_booking_only' };
  }
  if (ctx.subtotal < coupon.minSubtotal) return { ok: false, reason: 'min_subtotal_not_met' };
  return { ok: true, discount: couponDiscount(coupon, ctx.subtotal) };
}

export class PricingError extends Error {
  constructor(readonly issues: SelectionIssue[]) {
    super(`Invalid selections: ${issues.map((i) => i.code).join(', ')}`);
    this.name = 'PricingError';
  }
}

export interface PriceInput {
  service: Service;
  selections: BookingSelections;
  /** A coupon that has already passed `evaluateCoupon`. */
  coupon?: Coupon | null;
  extraCharges?: ExtraCharge[];
}

/**
 * Deterministic price calculation shared by the app (live quote), the mock API
 * (stored booking price) and admin. The visit fee and coupon are computed on
 * the booked work; approved on-site extras are added on top.
 */
export function calculatePrice(
  input: PriceInput,
  config: BusinessConfig = businessConfig,
): PriceBreakdown {
  const { service, selections, coupon, extraCharges = [] } = input;
  const issues = validateSelections(service, selections);
  if (issues.length) throw new PricingError(issues);

  const perUnit = isUnitPriced(service);
  const units = perUnit ? selections.units : 1;
  const items: PriceLineItem[] = [
    {
      kind: 'service',
      refId: service.id,
      label: service.name,
      quantity: units,
      unitPrice: service.basePrice,
      total: service.basePrice * units,
    },
  ];
  let durationPerUnit = service.durationMin;

  for (const group of service.optionGroups) {
    const choiceId = selections.options[group.id];
    const choice = group.choices.find((c) => c.id === choiceId);
    if (!choice) continue;
    durationPerUnit += choice.durationDeltaMin;
    if (choice.priceDelta === 0) continue;
    const quantity = perUnit ? units : 1;
    items.push({
      kind: 'option',
      refId: choice.id,
      label: choice.label,
      quantity,
      unitPrice: choice.priceDelta,
      total: choice.priceDelta * quantity,
    });
  }

  let addOnDuration = 0;
  for (const addOnId of selections.addOnIds) {
    const addOn = service.addOns.find((a) => a.id === addOnId);
    if (!addOn) continue;
    addOnDuration += addOn.durationMin;
    items.push({
      kind: 'addon',
      refId: addOn.id,
      label: addOn.name,
      quantity: 1,
      unitPrice: addOn.price,
      total: addOn.price,
    });
  }

  const bookedSubtotal = items.reduce((sum, item) => sum + item.total, 0);

  for (const extra of extraCharges) {
    if (extra.status !== 'approved') continue;
    items.push({
      kind: 'extra',
      refId: extra.id,
      label: { en: extra.description, ar: extra.description },
      quantity: 1,
      unitPrice: extra.amount,
      total: extra.amount,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const visitFee = bookedSubtotal >= config.freeVisitThreshold ? 0 : config.visitFee;
  const discount = coupon ? couponDiscount(coupon, bookedSubtotal) : 0;
  const tax = Math.round((subtotal + visitFee - discount) * config.taxRate);

  return {
    items,
    subtotal,
    visitFee,
    discount,
    tax,
    total: subtotal + visitFee - discount + tax,
    ...(coupon ? { couponCode: coupon.code } : {}),
    estimatedDurationMin: durationPerUnit * (perUnit ? units : 1) + addOnDuration,
  };
}

/**
 * Re-applies on-site extras to an existing booking price without re-pricing the
 * booked work (catalogue prices may have changed since the booking was made).
 */
export function withExtraCharges(
  price: PriceBreakdown,
  extraCharges: ExtraCharge[],
  config: BusinessConfig = businessConfig,
): PriceBreakdown {
  const booked = price.items.filter((item) => item.kind !== 'extra');
  const extras: PriceLineItem[] = extraCharges
    .filter((x) => x.status === 'approved')
    .map((x) => ({
      kind: 'extra',
      refId: x.id,
      label: { en: x.description, ar: x.description },
      quantity: 1,
      unitPrice: x.amount,
      total: x.amount,
    }));
  const items = [...booked, ...extras];
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round((subtotal + price.visitFee - price.discount) * config.taxRate);
  return {
    ...price,
    items,
    subtotal,
    tax,
    total: subtotal + price.visitFee - price.discount + tax,
  };
}

/** "From" price shown on service cards. */
export function startingPrice(service: Service): Fils {
  const units = isUnitPriced(service) ? service.minUnits : 1;
  const cheapestOptions = service.optionGroups
    .filter((g) => g.required)
    .reduce((sum, g) => sum + Math.min(...g.choices.map((c) => c.priceDelta)), 0);
  return (service.basePrice + cheapestOptions) * units;
}
