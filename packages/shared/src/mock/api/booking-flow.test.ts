/**
 * Customer booking-flow rules as served by the simulated API: addresses,
 * Friday scheduling, coupons, idempotent checkout, cancellation and rescheduling.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { kuwaitLocalToISO, MINUTE_MS, toKuwaitParts, toMs } from '../../domain/time';
import type { BookingSelections } from '../../types';
import { DEMO_ACCOUNTS } from '../data/people';
import { createMockApi, type MockApi } from './createMockApi';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
const FRIDAY = '2026-10-23';
const AC: BookingSelections = { options: { 'ac-type': 'split' }, units: 2, addOnIds: [] };

let clock = NOW;
let api: MockApi;

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (e) {
    return e instanceof ApiError ? e.code : 'unknown';
  }
}

async function signIn() {
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
  await api.auth.verifyOtp(c.requestId, '1234');
}

async function firstSlot(minStart = NOW + 24 * 60 * MINUTE_MS) {
  for (const date of await api.bookings.getBookableDates()) {
    const slot = (
      await api.bookings.getAvailableSlots({
        serviceId: 'svc-ac-cleaning',
        selections: AC,
        addressId: 'adr-01-home',
        date,
      })
    ).find((s) => s.available && toMs(s.start) >= minStart);
    if (slot) return slot;
  }
  throw new Error('no slot');
}

beforeEach(async () => {
  clock = NOW;
  api = createMockApi({ now: () => clock, latency: 0, autoConfirmAfterSec: null });
  await signIn();
});

describe('addresses', () => {
  it('saves a new address with normalised optional fields', async () => {
    const saved = await api.account.saveAddress({
      label: 'work',
      propertyType: 'office',
      areaId: 'sharq',
      block: ' 2 ',
      street: 'Khalid Bin Al-Waleed St',
      building: 'Tower 5',
      contactPhone: '9988 7766',
      paciNumber: '١٢٣٤٥٦٧٨',
      location: { lat: 29.38, lng: 47.99 },
    });
    expect(saved).toMatchObject({
      block: '2',
      contactPhone: '+96599887766',
      paciNumber: '12345678',
    });
  });

  it('rejects invalid phone numbers and incomplete apartments with field details', async () => {
    const error = await api.account
      .saveAddress({
        label: 'home',
        propertyType: 'apartment',
        areaId: 'salmiya',
        block: '10',
        street: 'Baghdad St',
        building: '33',
        contactPhone: '22410870',
        location: { lat: 29.33, lng: 48.07 },
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details).toEqual([
      { field: 'apartment', code: 'required' },
      { field: 'contactPhone', code: 'invalid' },
    ]);
  });
});

describe('scheduling', () => {
  it('opens Friday slots only after midday prayers', async () => {
    const slots = await api.bookings.getAvailableSlots({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      date: FRIDAY,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => toKuwaitParts(s.start).hour >= 14)).toBe(true);
  });

  it('never offers slots inside the lead time', async () => {
    const today = await api.bookings.getAvailableSlots({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      date: '2026-10-19',
    });
    for (const s of today.filter((x) => x.available)) {
      expect(toMs(s.start)).toBeGreaterThanOrEqual(NOW + 120 * MINUTE_MS);
    }
  });

  it('refuses to book a slot that is not available', async () => {
    expect(
      await code(
        api.bookings.create({
          serviceId: 'svc-ac-cleaning',
          selections: AC,
          addressId: 'adr-01-home',
          slotStart: kuwaitLocalToISO(FRIDAY, '08:00'),
          paymentMethod: 'cash',
        }),
      ),
    ).toBe('SLOT_UNAVAILABLE');
  });
});

describe('coupons at checkout', () => {
  it.each([
    ['COOL25', 'applied'],
    ['cool25', 'applied'],
    ['CLEAN5', 'rejected'],
    ['NATIONALDAY', 'rejected'],
    ['VIP15', 'rejected'],
    ['WELCOME10', 'rejected'],
    ['NOPE', 'rejected'],
  ])('%s is %s for AC cleaning', async (couponCode, status) => {
    const quote = await api.bookings.getQuote({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      couponCode,
    });
    expect(quote.coupon?.status).toBe(status);
  });

  it('explains why a coupon is rejected', async () => {
    const reasons = await Promise.all(
      ['CLEAN5', 'NATIONALDAY', 'VIP15', 'WELCOME10', 'NOPE'].map(async (couponCode) => {
        const q = await api.bookings.getQuote({
          serviceId: 'svc-ac-cleaning',
          selections: AC,
          couponCode,
        });
        return q.coupon?.status === 'rejected' ? q.coupon.reason : 'applied';
      }),
    );
    expect(reasons).toEqual([
      'category_not_eligible',
      'expired',
      'inactive',
      'first_booking_only',
      'not_found',
    ]);
  });

  it('refuses to create a booking with a rejected coupon', async () => {
    const slot = await firstSlot();
    expect(
      await code(
        api.bookings.create({
          serviceId: 'svc-ac-cleaning',
          selections: AC,
          addressId: 'adr-01-home',
          slotStart: slot.start,
          paymentMethod: 'cash',
          couponCode: 'CLEAN5',
        }),
      ),
    ).toBe('COUPON_INVALID');
  });
});

describe('duplicate submission protection', () => {
  it('returns the original booking when a checkout attempt is repeated', async () => {
    const slot = await firstSlot();
    const request = {
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slot.start,
      paymentMethod: 'knet' as const,
      idempotencyKey: 'checkout-attempt-1',
    };
    const before = (await api.bookings.list('all')).length;
    const [a, b] = await Promise.all([api.bookings.create(request), api.bookings.create(request)]);
    const c = await api.bookings.create(request);
    expect(a.id).toBe(b.id);
    expect(c.id).toBe(a.id);
    expect((await api.bookings.list('all')).length).toBe(before + 1);
  });

  it('treats a new attempt key as a new booking', async () => {
    const slot = await firstSlot();
    const base = {
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slot.start,
      paymentMethod: 'cash' as const,
    };
    const a = await api.bookings.create({ ...base, idempotencyKey: 'k1' });
    const later = await firstSlot(toMs(slot.start) + 24 * 60 * MINUTE_MS);
    const b = await api.bookings.create({ ...base, slotStart: later.start, idempotencyKey: 'k2' });
    expect(a.id).not.toBe(b.id);
  });

  it('returns the original booking when the same attempt is retried after a reload', async () => {
    const slot = await firstSlot();
    const request = {
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slot.start,
      paymentMethod: 'knet' as const,
      idempotencyKey: 'attempt-before-reload',
    };
    const original = await api.bookings.create(request);
    // A reload restores the persisted state into a fresh API instance.
    api = createMockApi({
      state: api.exportState(),
      now: () => clock,
      latency: 0,
      autoConfirmAfterSec: null,
    });
    const retried = await api.bookings.create(request);
    expect(retried.id).toBe(original.id);
    expect(retried.reference).toBe(original.reference);
    expect((await api.bookings.list('all')).filter((b) => b.id === original.id)).toHaveLength(1);
    // The confirmation can be rebuilt from API data alone.
    expect((await api.bookings.get(original.id)).reference).toBe(original.reference);
  });
});

describe('cancellation and rescheduling', () => {
  it('cannot cancel a visit that is already under way', async () => {
    expect(await code(api.bookings.cancel('bkg-demo-live', 'Changed my mind'))).toBe('CONFLICT');
  });

  it('refunds wallet bookings in full when cancelled early and charges the fee when late', async () => {
    const early = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: { ...AC, units: 1 }, // KWD 9.000 fits the demo wallet balance
      addressId: 'adr-01-home',
      slotStart: (await firstSlot()).start,
      paymentMethod: 'wallet',
    });
    expect(early.cancellationFee).toBe(0);
    const cancelled = await api.bookings.cancel(early.id, 'Plans changed');
    expect(cancelled.cancellation).toMatchObject({ fee: 0, refundAmount: early.price.total });

    const slot = await firstSlot();
    const late = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slot.start,
      paymentMethod: 'card',
    });
    clock = toMs(slot.start) - 90 * MINUTE_MS;
    const view = await api.bookings.get(late.id);
    expect(view.cancellationFee).toBe(2_000);
    const lateCancel = await api.bookings.cancel(late.id, 'Running late');
    expect(lateCancel.cancellation?.refundAmount).toBe(late.price.total - 2_000);
    expect(lateCancel.payment.status).toBe('partially_refunded');
  });

  it('refuses rescheduling inside the free-change window and into unavailable slots', async () => {
    const slot = await firstSlot();
    const booking = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slot.start,
      paymentMethod: 'cash',
    });
    expect(await code(api.bookings.reschedule(booking.id, kuwaitLocalToISO(FRIDAY, '08:00')))).toBe(
      'SLOT_UNAVAILABLE',
    );
    clock = toMs(slot.start) - 60 * MINUTE_MS;
    expect((await api.bookings.get(booking.id)).canReschedule).toBe(false);
    expect(await code(api.bookings.getRescheduleSlots(booking.id, FRIDAY))).toBe('CONFLICT');
  });
});
