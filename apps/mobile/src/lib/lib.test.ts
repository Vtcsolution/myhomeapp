import { calculatePrice, defaultSelections, type Service, startingPrice } from '@myhome/shared';
import { createSeedState } from '@myhome/shared/mock';
import { describe, expect, it } from 'vitest';
import { ltrIsolate } from './bidi';
import { addRecentSearch, parseRecentSearches } from './recentSearches';
import { bookAgain, recommended } from './recommendations';
import { decodeSelections, encodeSelections } from './selectionCodec';
import { availablePricingFilters, filterByPricing, sortServices } from './serviceFilters';

const state = createSeedState({ now: '2026-10-19T07:30:00.000Z' });
const services = state.services;
const service = (id: string): Service => {
  const s = services.find((x) => x.id === id);
  if (!s) throw new Error(id);
  return s;
};

describe('service sorting and filtering', () => {
  const ac = services.filter((s) => s.categoryId === 'cat-ac');

  it('sorts by starting price in both directions', () => {
    const asc = sortServices(ac, 'price_asc').map(startingPrice);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortServices(ac, 'price_desc').map(startingPrice);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('sorts by rating and puts popular services first', () => {
    const rated = sortServices(ac, 'rating').map((s) => s.rating);
    expect(rated).toEqual([...rated].sort((a, b) => b - a));
    const popular = sortServices(ac, 'popular');
    const firstNonPopular = popular.findIndex((s) => !s.isPopular);
    expect(popular.slice(firstNonPopular).every((s) => !s.isPopular)).toBe(true);
  });

  it('does not mutate its input', () => {
    const before = ac.map((s) => s.id);
    sortServices(ac, 'price_desc');
    expect(ac.map((s) => s.id)).toEqual(before);
  });

  it('filters by pricing group and only offers useful filters', () => {
    expect(filterByPricing(ac, 'inspection').map((s) => s.id)).toEqual(['svc-ac-repair']);
    expect(
      filterByPricing(ac, 'unit').every((s) => ['per_unit', 'hourly'].includes(s.pricingModel)),
    ).toBe(true);
    expect(availablePricingFilters(ac)).toEqual(['all', 'fixed', 'unit', 'inspection']);
    const singleKind = services.filter((s) => s.id === 'svc-ac-cleaning');
    expect(availablePricingFilters(singleKind)).toEqual([]);
  });
});

describe('selection codec', () => {
  const ac = service('svc-ac-cleaning');

  it('round-trips a valid selection', () => {
    const selections = { options: { 'ac-type': 'cassette' }, addOnIds: ['drain-flush'], units: 4 };
    const decoded = decodeSelections(encodeSelections(selections), ac);
    expect(decoded).toEqual({ selections, usedDefaults: false });
    expect(calculatePrice({ service: ac, selections: decoded.selections }).total).toBe(
      calculatePrice({ service: ac, selections }).total,
    );
  });

  it.each([
    undefined,
    'not json',
    JSON.stringify({ o: { 'ac-type': 'nope' }, a: [], u: 1 }),
    JSON.stringify({ o: { 'ac-type': 'split' }, a: [], u: 99 }),
    JSON.stringify({ o: { 'ac-type': 'split' }, a: ['unknown'], u: 1 }),
    JSON.stringify({ o: 5, a: 'x', u: '2' }),
  ])('falls back to defaults for %s', (raw) => {
    expect(decodeSelections(raw, ac)).toEqual({
      selections: defaultSelections(ac),
      usedDefaults: true,
    });
  });
});

describe('recommendations', () => {
  const nouraBookings = state.bookings.filter((b) => b.customerId === 'cus-01');

  it('offers each completed service once, most recent first', () => {
    const items = bookAgain(nouraBookings, services);
    const ids = items.map((i) => i.service.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('svc-handyman-tv');
    const dates = items.map((i) => Date.parse(i.lastBookedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('recommends unbooked services, preferring familiar categories', () => {
    const recs = recommended(nouraBookings, services, 6);
    const booked = new Set(nouraBookings.map((b) => b.serviceId));
    expect(recs).toHaveLength(6);
    expect(recs.every((s) => !booked.has(s.id))).toBe(true);
    const usedCategories = new Set(nouraBookings.map((b) => b.categoryId));
    expect(usedCategories.has(recs[0]?.categoryId ?? '')).toBe(true);
  });

  it('falls back to popular services for a new customer', () => {
    const recs = recommended([], services, 3);
    expect(recs.every((s) => s.isPopular)).toBe(true);
  });
});

describe('recent searches', () => {
  it('adds to the front, de-duplicates equivalent queries and caps the list', () => {
    let list: string[] = [];
    list = addRecentSearch(list, 'AC cleaning');
    list = addRecentSearch(list, '  التكييف ');
    list = addRecentSearch(list, 'ac  CLEANING');
    expect(list).toEqual(['ac CLEANING', 'التكييف']);
    expect(addRecentSearch(list, 'أ')).toEqual(list);
    for (let i = 0; i < 10; i++) list = addRecentSearch(list, `query ${i}`);
    expect(list).toHaveLength(6);
  });

  it('parses stored values defensively', () => {
    expect(parseRecentSearches(null)).toEqual([]);
    expect(parseRecentSearches('{bad')).toEqual([]);
    expect(parseRecentSearches(JSON.stringify(['a', 2, 'b']))).toEqual(['a', 'b']);
  });
});

describe('bidi helper', () => {
  it('marks Latin text as left-to-right and leaves Arabic untouched', () => {
    expect(ltrIsolate('Abdullah A.')).toBe('Abdullah A.‎');
    expect(ltrIsolate('نورة ك.')).toBe('نورة ك.');
  });
});
