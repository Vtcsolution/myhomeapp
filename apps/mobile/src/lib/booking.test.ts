import {
  type BookingSelections,
  calculatePrice,
  kuwaitLocalToISO,
  type PriceBreakdown,
  type Service,
  type TimeSlot,
} from '@myhome/shared';
import { createSeedState } from '@myhome/shared/mock';
import { describe, expect, it } from 'vitest';
import {
  emptyAddressForm,
  fieldErrors,
  formFromAddress,
  inputFromForm,
  issuesFromError,
  validateForm,
} from './addressForm';
import { bookingFlowRoutes, parseFlowParams, readyFor } from './bookingFlow';
import { couponFeedbackKey, normalizeCouponCode } from './coupon';
import { createOnceGuard, newAttemptKey } from './onceGuard';
import { priceRows } from './priceRows';
import { firstAvailableDate, groupSlots, isSlotStillAvailable } from './slots';
import { buildTimeline, travelProgress } from './timeline';

const state = createSeedState({ now: '2026-10-19T07:30:00.000Z' });
const service = (id: string): Service => state.services.find((s) => s.id === id)!;

describe('address form', () => {
  const noura = state.customers.find((c) => c.id === 'cus-01')!;

  it('round-trips an existing address without changes', () => {
    const address = noura.addresses[0]!;
    const input = inputFromForm(formFromAddress(address));
    expect(input).toMatchObject({
      id: address.id,
      areaId: 'salwa',
      block: '4',
      street: '12',
      avenue: '3',
      building: '27',
      paciNumber: '18734522',
    });
    expect(validateForm(formFromAddress(address))).toEqual({});
  });

  it('reports field errors from the shared rules', () => {
    expect(validateForm(emptyAddressForm(true))).toEqual({
      areaId: 'required',
      block: 'required',
      street: 'required',
      building: 'required',
      apartment: 'required',
    });
    const withPhone = {
      ...emptyAddressForm(false),
      propertyType: 'villa' as const,
      areaId: 'rawda',
      block: '2',
      street: '24',
      building: '9',
      contactPhone: '2241 0870',
    };
    expect(validateForm(withPhone)).toEqual({ contactPhone: 'invalid' });
    expect(validateForm({ ...withPhone, contactPhone: '9988 7766' })).toEqual({});
  });

  it('uses the area centre as the approximate location and omits empty optionals', () => {
    const input = inputFromForm({
      ...emptyAddressForm(false),
      areaId: 'jahra',
      block: '2',
      street: '6',
      building: '40',
    });
    expect(input.location).toEqual({ lat: 29.3375, lng: 47.6581 });
    expect(input.avenue).toBeUndefined();
  });

  it('reads issues from API error details defensively', () => {
    expect(issuesFromError([{ field: 'block', code: 'required' }, 'junk', null])).toEqual([
      { field: 'block', code: 'required' },
    ]);
    expect(issuesFromError('not an array')).toEqual([]);
    expect(
      fieldErrors([
        { field: 'block', code: 'required' },
        { field: 'block', code: 'too_long' },
      ]),
    ).toEqual({ block: 'required' });
  });
});

describe('booking flow parameters', () => {
  it('parses and validates route params', () => {
    expect(parseFlowParams({})).toBeNull();
    expect(parseFlowParams({ serviceId: 's', selections: 'x', slot: 'not-a-date' })).toEqual({
      serviceId: 's',
      selections: 'x',
    });
    const full = parseFlowParams({
      serviceId: 's',
      selections: 'x',
      addressId: 'a',
      slot: '2026-10-20T07:00:00.000Z',
    });
    expect(readyFor(full)).toBe('checkout');
    expect(readyFor({ serviceId: 's', selections: 'x' })).toBe('address');
    expect(readyFor({ serviceId: 's', selections: 'x', addressId: 'a' })).toBe('schedule');
  });

  it('builds links that keep every earlier choice', () => {
    expect(
      bookingFlowRoutes.checkout({ serviceId: 's', selections: 'x', addressId: 'a', slot: 'z' }),
    ).toEqual({
      pathname: '/customer/book/checkout',
      params: { serviceId: 's', selections: 'x', addressId: 'a', slot: 'z' },
    });
  });
});

describe('scheduling helpers', () => {
  const at = (time: string, available: boolean): TimeSlot => ({
    start: kuwaitLocalToISO('2026-10-20', time),
    end: kuwaitLocalToISO('2026-10-20', time),
    available,
    capacity: available ? 1 : 0,
  });

  it('groups windows into morning, afternoon and evening in Kuwait time', () => {
    const groups = groupSlots([
      at('20:00', true),
      at('08:00', false),
      at('14:00', true),
      at('10:00', true),
    ]);
    expect(groups.map((g) => [g.period, g.slots.length])).toEqual([
      ['morning', 2],
      ['afternoon', 1],
      ['evening', 1],
    ]);
  });

  it('finds the first date with availability and re-checks a chosen slot', () => {
    const map = new Map([
      ['2026-10-19', [at('08:00', false)]],
      ['2026-10-20', [at('10:00', true)]],
    ]);
    expect(firstAvailableDate(['2026-10-19', '2026-10-20'], map)).toBe('2026-10-20');
    expect(isSlotStillAvailable(at('10:00', true).start, map.get('2026-10-20'))).toBe(true);
    expect(isSlotStillAvailable(at('08:00', false).start, map.get('2026-10-19'))).toBe(false);
  });
});

describe('price display', () => {
  const selections: BookingSelections = {
    options: { 'ac-type': 'cassette' },
    units: 3,
    addOnIds: ['anti-bacterial'],
  };
  const coupon = state.coupons.find((c) => c.code === 'COOL25')!;

  it('shows exactly the amounts in the shared breakdown', () => {
    const price: PriceBreakdown = calculatePrice({
      service: service('svc-ac-cleaning'),
      selections,
      coupon,
    });
    const rows = priceRows(price);
    expect(rows.filter((r) => r.kind === 'item').map((r) => r.amount)).toEqual(
      price.items.map((i) => i.total),
    );
    expect(rows.find((r) => r.kind === 'subtotal')?.amount).toBe(price.subtotal);
    expect(rows.find((r) => r.kind === 'discount')).toMatchObject({
      code: 'COOL25',
      amount: -price.discount,
    });
    expect(rows.at(-1)).toEqual({ kind: 'total', key: 'total', amount: price.total });
  });

  it('marks the visit fee as waived and omits zero discount and tax', () => {
    const rows = priceRows(calculatePrice({ service: service('svc-ac-cleaning'), selections }));
    expect(rows.find((r) => r.kind === 'visitFee')).toMatchObject({ waived: true, amount: 0 });
    expect(rows.some((r) => r.kind === 'discount' || r.kind === 'tax')).toBe(false);
  });
});

describe('coupon feedback', () => {
  it('normalises codes', () => {
    expect(normalizeCouponCode(' cool 25 ')).toBe('COOL25');
  });

  it.each([
    [{ code: 'A', status: 'applied', discount: 1 } as const, 'checkout.couponApplied'],
    [{ code: 'A', status: 'rejected', reason: 'not_found' } as const, 'checkout.couponNotFound'],
    [{ code: 'A', status: 'rejected', reason: 'expired' } as const, 'checkout.couponExpired'],
    [
      { code: 'A', status: 'rejected', reason: 'min_subtotal_not_met' } as const,
      'checkout.couponMinSpend',
    ],
    [
      { code: 'A', status: 'rejected', reason: 'category_not_eligible' } as const,
      'checkout.couponCategory',
    ],
    [
      { code: 'A', status: 'rejected', reason: 'first_booking_only' } as const,
      'checkout.couponFirstBooking',
    ],
  ])('%o → %s', (result, key) => {
    expect(couponFeedbackKey(result)).toBe(key);
  });
});

describe('duplicate submission guard', () => {
  it('runs an action once while it is in flight and allows it again afterwards', async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const guarded = createOnceGuard(
      () =>
        new Promise<number>((resolve) => {
          calls += 1;
          release = () => resolve(calls);
        }),
    );
    const first = guarded();
    const second = guarded();
    expect(guarded.isRunning()).toBe(true);
    release();
    expect(await first).toBe(1);
    expect(await second).toBe(1);
    expect(calls).toBe(1);
    expect(guarded.isRunning()).toBe(false);
    const third = guarded();
    release();
    expect(await third).toBe(2);
  });

  it('releases the guard after a failure so the customer can retry', async () => {
    let attempts = 0;
    const guarded = createOnceGuard(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('network');
      return 'ok';
    });
    await expect(guarded()).rejects.toThrow('network');
    await expect(guarded()).resolves.toBe('ok');
  });

  it('creates distinct attempt keys', () => {
    expect(newAttemptKey()).not.toBe(newAttemptKey());
  });
});

describe('status timeline', () => {
  const booking = (id: string) => state.bookings.find((b) => b.id === id)!;

  it('marks reached steps done and the current step current', () => {
    const steps = buildTimeline(booking('bkg-demo-live'));
    expect(steps.map((s) => s.state)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(steps[2]?.at).toBeDefined();
    expect(steps[3]?.at).toBeUndefined();
  });

  it('completes every step for completed bookings', () => {
    expect(buildTimeline(booking('bkg-demo-gas')).every((s) => s.state === 'done')).toBe(true);
  });

  it('ends cancelled bookings with a cancelled step', () => {
    const steps = buildTimeline(booking('bkg-demo-cancelled'));
    expect(steps.map((s) => s.status)).toEqual(['pending', 'cancelled']);
    expect(steps.at(-1)?.state).toBe('current');
  });

  it('computes simulated travel progress', () => {
    expect(travelProgress(0, 20)).toBe(0);
    expect(travelProgress(10, 10)).toBe(0.5);
    expect(travelProgress(60, 0)).toBe(0.97);
    expect(travelProgress(5, null)).toBe(0);
  });
});
