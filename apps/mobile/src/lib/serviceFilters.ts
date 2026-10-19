/**
 * Sorting and filtering for service lists. Pure functions (no React Native),
 * so they are unit-tested and reusable by any screen.
 */
import { type PricingModel, type Service, startingPrice } from '@myhome/shared';

export type ServiceSort = 'popular' | 'price_asc' | 'price_desc' | 'rating';

/** Pricing filter groups shown to customers ("per unit" and "hourly" read the same to them). */
export type PricingFilter = 'all' | 'fixed' | 'unit' | 'inspection';

const FILTER_MODELS: Record<Exclude<PricingFilter, 'all'>, PricingModel[]> = {
  fixed: ['fixed'],
  unit: ['per_unit', 'hourly'],
  inspection: ['inspection'],
};

export function sortServices(services: readonly Service[], sort: ServiceSort): Service[] {
  const list = [...services];
  switch (sort) {
    case 'price_asc':
      return list.sort(
        (a, b) => startingPrice(a) - startingPrice(b) || b.bookingsCount - a.bookingsCount,
      );
    case 'price_desc':
      return list.sort(
        (a, b) => startingPrice(b) - startingPrice(a) || b.bookingsCount - a.bookingsCount,
      );
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
    case 'popular':
      return list.sort(
        (a, b) => Number(b.isPopular) - Number(a.isPopular) || b.bookingsCount - a.bookingsCount,
      );
  }
}

export function filterByPricing(services: readonly Service[], filter: PricingFilter): Service[] {
  if (filter === 'all') return [...services];
  const models = FILTER_MODELS[filter];
  return services.filter((s) => models.includes(s.pricingModel));
}

/** Only offer filters that would return something (plus "all"). */
export function availablePricingFilters(services: readonly Service[]): PricingFilter[] {
  const present = (Object.keys(FILTER_MODELS) as Exclude<PricingFilter, 'all'>[]).filter((f) =>
    services.some((s) => FILTER_MODELS[f].includes(s.pricingModel)),
  );
  return present.length > 1 ? ['all', ...present] : [];
}
