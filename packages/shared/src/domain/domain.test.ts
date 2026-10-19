import { describe, expect, it } from 'vitest';
import { services } from '../mock/data/catalog';
import type { Booking, Coupon, Service, Technician } from '../types';
import { bookingProgress, canTransition, nextTechnicianStatus } from './bookingStatus';
import {
  calculatePrice,
  defaultSelections,
  evaluateCoupon,
  type CouponRejection,
  PricingError,
  startingPrice,
  validateSelections,
  withExtraCharges,
} from './pricing';
import { computeSlots, dayWindows, isTechnicianFree } from './schedule';
import {
  addDaysToLocalDate,
  kuwaitDateOf,
  kuwaitLocalToISO,
  parseHHmm,
  weekdayOfLocalDate,
} from './time';

const NOW = '2026-10-19T07:30:00.000Z'; // Monday 10:30 Kuwait
const service = (id: string): Service => {
  const found = services.find((s) => s.id === id);
  if (!found) throw new Error(id);
  return found;
};

const coupon = (patch: Partial<Coupon> = {}): Coupon => ({
  id: 'c',
  code: 'TEST',
  description: { en: '', ar: '' },
  type: 'percent',
  value: 25,
  maxDiscount: 7_000,
  minSubtotal: 8_000,
  categoryIds: [],
  firstBookingOnly: false,
  validFrom: '2026-01-01T00:00:00.000Z',
  validUntil: '2026-12-31T00:00:00.000Z',
  usageLimit: 100,
  usedCount: 0,
  isActive: true,
  ...patch,
});

describe('Kuwait time', () => {
  it('converts local Kuwait time to UTC', () => {
    expect(kuwaitLocalToISO('2026-10-19', '10:00')).toBe('2026-10-19T07:00:00.000Z');
    expect(kuwaitDateOf('2026-10-19T21:30:00.000Z')).toBe('2026-10-20');
  });

  it('does calendar arithmetic across month and year ends', () => {
    expect(addDaysToLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToLocalDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOfLocalDate('2026-10-23')).toBe(5);
  });

  it('rejects malformed times', () => {
    expect(() => parseHHmm('25:00')).toThrow();
    expect(() => parseHHmm('9am')).toThrow();
    expect(parseHHmm('08:30')).toBe(510);
  });
});

describe('booking status machine', () => {
  it('lets each role make only its own transitions', () => {
    expect(canTransition('pending', 'confirmed', 'technician')).toBe(true);
    expect(canTransition('pending', 'cancelled', 'customer')).toBe(true);
    expect(canTransition('confirmed', 'cancelled', 'customer')).toBe(true);
    expect(canTransition('on_the_way', 'cancelled', 'customer')).toBe(false);
    expect(canTransition('confirmed', 'cancelled', 'technician')).toBe(false);
    expect(canTransition('in_progress', 'cancelled', 'admin')).toBe(true);
    expect(canTransition('confirmed', 'arrived', 'admin')).toBe(false);
    expect(canTransition('completed', 'cancelled', 'admin')).toBe(false);
  });

  it('walks the technician flow', () => {
    expect(nextTechnicianStatus('confirmed')).toBe('on_the_way');
    expect(nextTechnicianStatus('on_the_way')).toBe('arrived');
    expect(nextTechnicianStatus('arrived')).toBe('in_progress');
    expect(nextTechnicianStatus('in_progress')).toBe('completed');
    expect(nextTechnicianStatus('pending')).toBeNull();
    expect(nextTechnicianStatus('completed')).toBeNull();
    expect(bookingProgress('completed')).toBe(1);
    expect(bookingProgress('cancelled')).toBe(0);
  });
});

describe('pricing', () => {
  it('prices per-unit services with options and add-ons', () => {
    const price = calculatePrice({
      service: service('svc-ac-cleaning'),
      selections: { options: { 'ac-type': 'split' }, units: 3, addOnIds: ['anti-bacterial'] },
    });
    expect(price.subtotal).toBe(26_000);
    expect(price.visitFee).toBe(0);
    expect(price.total).toBe(26_000);
    expect(price.estimatedDurationMin).toBe(45 * 3 + 15);
  });

  it('applies per-unit option deltas, including negative ones', () => {
    const price = calculatePrice({
      service: service('svc-ac-cleaning'),
      selections: { options: { 'ac-type': 'window' }, units: 2, addOnIds: [] },
    });
    expect(price.items.find((i) => i.kind === 'option')?.total).toBe(-4_000);
    expect(price.subtotal).toBe(12_000);
    expect(price.estimatedDurationMin).toBe(70);
  });

  it('prices hourly services', () => {
    const price = calculatePrice({
      service: service('svc-cleaning-regular'),
      selections: { options: { cleaners: 'two' }, units: 3, addOnIds: [] },
    });
    expect(price.subtotal).toBe(21_000);
  });

  it('adds the visit fee below the threshold', () => {
    const price = calculatePrice({
      service: service('svc-smart-satellite'),
      selections: { options: { 'satellite-job': 'receiver' }, units: 1, addOnIds: [] },
    });
    expect(price.subtotal).toBe(5_000);
    expect(price.visitFee).toBe(1_000);
    expect(price.total).toBe(6_000);
  });

  it('applies coupons with caps', () => {
    const ac = service('svc-ac-cleaning');
    const small = calculatePrice({
      service: ac,
      selections: { options: { 'ac-type': 'split' }, units: 3, addOnIds: ['anti-bacterial'] },
      coupon: coupon(),
    });
    expect(small.discount).toBe(6_500);
    expect(small.total).toBe(19_500);
    expect(small.couponCode).toBe('TEST');
    const large = calculatePrice({
      service: ac,
      selections: { options: { 'ac-type': 'split' }, units: 5, addOnIds: [] },
      coupon: coupon(),
    });
    expect(large.discount).toBe(7_000);
    const fixed = calculatePrice({
      service: ac,
      selections: { options: { 'ac-type': 'split' }, units: 5, addOnIds: [] },
      coupon: coupon({ type: 'fixed', value: 5_000 }),
    });
    expect(fixed.discount).toBe(5_000);
  });

  it('validates selections', () => {
    const ac = service('svc-ac-cleaning');
    expect(
      validateSelections(ac, { options: {}, units: 0, addOnIds: ['nope'] })
        .map((i) => i.code)
        .sort(),
    ).toEqual(['missing_required_option', 'units_out_of_range', 'unknown_add_on']);
    expect(() =>
      calculatePrice({ service: ac, selections: { options: {}, units: 1, addOnIds: [] } }),
    ).toThrow(PricingError);
  });

  it('prices every catalogue service with its default selections', () => {
    for (const s of services) {
      const price = calculatePrice({ service: s, selections: defaultSelections(s) });
      expect(price.total, s.id).toBeGreaterThan(0);
      expect(price.estimatedDurationMin, s.id).toBeGreaterThan(0);
      expect(startingPrice(s), s.id).toBeGreaterThan(0);
      expect(startingPrice(s), s.id).toBeLessThanOrEqual(price.subtotal);
    }
  });

  it('adds approved extras without re-pricing the booked work', () => {
    const base = calculatePrice({
      service: service('svc-plumbing-leak'),
      selections: { options: { location: 'bathroom' }, units: 1, addOnIds: [] },
    });
    const updated = withExtraCharges(base, [
      { id: 'x1', description: 'Pipe joint', amount: 18_000, status: 'approved', createdAt: NOW },
      { id: 'x2', description: 'Declined', amount: 9_000, status: 'declined', createdAt: NOW },
      {
        id: 'x3',
        description: 'Pending',
        amount: 4_000,
        status: 'pending_approval',
        createdAt: NOW,
      },
    ]);
    expect(updated.total).toBe(base.total + 18_000);
    expect(updated.visitFee).toBe(base.visitFee);
    expect(updated.items.filter((i) => i.kind === 'extra')).toHaveLength(1);
  });
});

describe('coupon eligibility', () => {
  const ctx = { subtotal: 20_000, categoryId: 'cat-ac', now: NOW, previousBookings: 2 };
  it.each<[Partial<Coupon>, CouponRejection]>([
    [{ isActive: false }, 'inactive'],
    [{ validFrom: '2026-11-01T00:00:00.000Z' }, 'not_started'],
    [{ validUntil: '2026-10-01T00:00:00.000Z' }, 'expired'],
    [{ usedCount: 100 }, 'usage_limit_reached'],
    [{ categoryIds: ['cat-cleaning'] }, 'category_not_eligible'],
    [{ firstBookingOnly: true }, 'first_booking_only'],
    [{ minSubtotal: 30_000 }, 'min_subtotal_not_met'],
  ])('rejects %o with %s', (patch, reason) => {
    expect(evaluateCoupon(coupon(patch), ctx)).toEqual({ ok: false, reason });
  });

  it('accepts a valid coupon', () => {
    expect(evaluateCoupon(coupon(), ctx)).toEqual({ ok: true, discount: 5_000 });
  });
});

describe('scheduling', () => {
  const technician = {
    id: 't1',
    availability: {
      weekly: {
        0: { start: '08:00', end: '20:00' },
        1: { start: '08:00', end: '20:00' },
        2: { start: '08:00', end: '20:00' },
        3: { start: '08:00', end: '20:00' },
        4: { start: '08:00', end: '20:00' },
        5: null,
        6: { start: '08:00', end: '20:00' },
      },
      daysOff: ['2026-10-21'],
    },
  } as unknown as Technician;

  it('builds arrival windows from working hours (Friday opens after prayers)', () => {
    expect(dayWindows('2026-10-19')).toHaveLength(7);
    const friday = dayWindows('2026-10-23');
    expect(friday).toHaveLength(4);
    expect(friday[0]?.start).toBe(kuwaitLocalToISO('2026-10-23', '14:00'));
  });

  it('respects lead time, availability and days off', () => {
    const slots = computeSlots({
      date: '2026-10-19',
      now: NOW,
      durationMin: 60,
      technicians: [technician],
      bookings: [],
    });
    expect(slots.map((s) => s.available)).toEqual([false, false, false, true, true, true, false]);
    const dayOff = computeSlots({
      date: '2026-10-21',
      now: NOW,
      durationMin: 60,
      technicians: [technician],
      bookings: [],
    });
    expect(dayOff.every((s) => !s.available)).toBe(true);
    const beyond = computeSlots({
      date: '2026-12-01',
      now: NOW,
      durationMin: 60,
      technicians: [technician],
      bookings: [],
    });
    expect(beyond).toEqual([]);
  });

  it('blocks overlapping assigned jobs, including long jobs', () => {
    const booking = {
      id: 'b1',
      technicianId: 't1',
      status: 'confirmed',
      scheduledStart: kuwaitLocalToISO('2026-10-20', '10:00'),
      scheduledEnd: kuwaitLocalToISO('2026-10-20', '12:00'),
      price: { estimatedDurationMin: 300 },
    } as unknown as Booking;
    const at = (t: string) => kuwaitLocalToISO('2026-10-20', t);
    expect(isTechnicianFree('t1', at('12:00'), at('14:00'), [booking])).toBe(false);
    expect(isTechnicianFree('t1', at('16:00'), at('18:00'), [booking])).toBe(true);
    expect(isTechnicianFree('t1', at('12:00'), at('14:00'), [booking], 'b1')).toBe(true);
    expect(
      isTechnicianFree('t1', at('12:00'), at('14:00'), [{ ...booking, status: 'cancelled' }]),
    ).toBe(true);
  });
});
