/**
 * Service price editing. Amounts are typed in KWD (up to 3 decimals) and sent
 * to the API in fils; only changed values are sent. The API validates again —
 * these checks only give immediate feedback on the form.
 */
import { parseKwdToFils, type Service, type ServicePricingInput } from '@myhome/shared';

export interface PricingDraft {
  basePrice: string;
  minUnits: string;
  maxUnits: string;
  /** Option choice id → price difference in KWD. */
  options: Record<string, string>;
  /** Add-on id → price in KWD. */
  addOns: Record<string, string>;
}

export type PricingErrors = Record<string, 'amount' | 'units' | 'floor'>;

/** Option differences may be negative (a cheaper variant): "-2.000" or "−2". */
export function parseSignedKwdToFils(input: string): number | null {
  const trimmed = input.trim();
  const negative = /^[-−]/.test(trimmed);
  const fils = parseKwdToFils(negative ? trimmed.slice(1) : trimmed);
  return fils === null ? null : negative ? -fils : fils;
}

export const kwdInput = (fils: number) => (fils / 1000).toFixed(3);

export function draftFromService(service: Service): PricingDraft {
  return {
    basePrice: kwdInput(service.basePrice),
    minUnits: String(service.minUnits),
    maxUnits: String(service.maxUnits),
    options: Object.fromEntries(
      service.optionGroups.flatMap((g) => g.choices.map((c) => [c.id, kwdInput(c.priceDelta)])),
    ),
    addOns: Object.fromEntries(service.addOns.map((a) => [a.id, kwdInput(a.price)])),
  };
}

export function pricingFromDraft(
  service: Service,
  draft: PricingDraft,
): { input: ServicePricingInput; errors: PricingErrors; changed: boolean } {
  const errors: PricingErrors = {};
  const input: ServicePricingInput = {};

  const base = parseKwdToFils(draft.basePrice);
  if (base === null || base <= 0) errors.basePrice = 'amount';
  else if (base !== service.basePrice) input.basePrice = base;

  const min = Number(draft.minUnits);
  const max = Number(draft.maxUnits);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min || max > 50) {
    errors.units = 'units';
  } else {
    if (min !== service.minUnits) input.minUnits = min;
    if (max !== service.maxUnits) input.maxUnits = max;
  }

  const optionPrices: Record<string, number> = {};
  const effectiveBase = base !== null && base > 0 ? base : service.basePrice;
  for (const group of service.optionGroups) {
    for (const choice of group.choices) {
      const value = parseSignedKwdToFils(draft.options[choice.id] ?? '');
      if (value === null) errors[`option:${choice.id}`] = 'amount';
      // Same rule as the API: an option never brings the price to zero or below.
      else if (effectiveBase + value <= 0) errors[`option:${choice.id}`] = 'floor';
      else if (value !== choice.priceDelta) optionPrices[choice.id] = value;
    }
  }
  if (Object.keys(optionPrices).length) input.optionPrices = optionPrices;

  const addOnPrices: Record<string, number> = {};
  for (const addOn of service.addOns) {
    const value = parseKwdToFils(draft.addOns[addOn.id] ?? '');
    if (value === null || value <= 0) errors[`addon:${addOn.id}`] = 'amount';
    else if (value !== addOn.price) addOnPrices[addOn.id] = value;
  }
  if (Object.keys(addOnPrices).length) input.addOnPrices = addOnPrices;

  return { input, errors, changed: Object.keys(input).length > 0 };
}

/** The service as it would be with the valid parts of the draft (for the price preview). */
export function previewService(service: Service, input: ServicePricingInput): Service {
  return {
    ...service,
    basePrice: input.basePrice ?? service.basePrice,
    minUnits: input.minUnits ?? service.minUnits,
    maxUnits: input.maxUnits ?? service.maxUnits,
    optionGroups: service.optionGroups.map((g) => ({
      ...g,
      choices: g.choices.map((c) => ({
        ...c,
        priceDelta: input.optionPrices?.[c.id] ?? c.priceDelta,
      })),
    })),
    addOns: service.addOns.map((a) => ({ ...a, price: input.addOnPrices?.[a.id] ?? a.price })),
  };
}
