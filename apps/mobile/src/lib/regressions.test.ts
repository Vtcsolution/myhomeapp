/**
 * Regression tests for issues found after stage 4:
 *  - a web reload during checkout must never lead to a second booking, and a
 *    flow that was already booked must offer that booking's confirmation;
 *  - a fast double tap must not carry through to the confirmation's buttons;
 *  - when rescheduling, the current window is marked and cannot be chosen.
 */
import type { TimeSlot } from '@myhome/shared';
import { describe, expect, it } from 'vitest';
import type { BookingFlowState } from './bookingFlow';
import {
  ATTEMPT_TTL_MS,
  attemptFor,
  flowSignature,
  isResumable,
  pruneAttempts,
  recordBooking,
  resetAttempt,
} from './checkoutAttempts';
import { firstAvailableDate, slotState } from './slots';
import { createTapGuard, TAP_GUARD_MS } from './tapGuard';

const FLOW: BookingFlowState = {
  serviceId: 'svc-ac-installation',
  selections: '{"o":{"capacity":"1-5-ton"},"a":[],"u":1}',
  addressId: 'adr-01-home',
  slot: '2026-10-20T11:00:00.000Z',
};
const NOW = Date.parse('2026-10-19T09:00:00.000Z');

describe('checkout attempts survive a reload', () => {
  it('reuses the same idempotency key for the same flow', () => {
    const sig = flowSignature(FLOW);
    const first = attemptFor({}, sig, NOW);
    // "Reload": the store is read back and asked again.
    const again = attemptFor(JSON.parse(JSON.stringify(first.store)), sig, NOW + 5_000);
    expect(again.attempt.key).toBe(first.attempt.key);
  });

  it('uses a different key for a different time or address', () => {
    const a = attemptFor({}, flowSignature(FLOW), NOW);
    const b = attemptFor(
      a.store,
      flowSignature({ ...FLOW, slot: '2026-10-20T13:00:00.000Z' }),
      NOW,
    );
    const c = attemptFor(b.store, flowSignature({ ...FLOW, addressId: 'adr-01-family' }), NOW);
    expect(new Set([a.attempt.key, b.attempt.key, c.attempt.key]).size).toBe(3);
  });

  it('remembers the booking created by an attempt so it can be resumed', () => {
    const sig = flowSignature(FLOW);
    const { store } = attemptFor({}, sig, NOW);
    const booked = recordBooking(store, sig, 'bkg-1002');
    expect(attemptFor(booked, sig, NOW).attempt.bookingId).toBe('bkg-1002');
  });

  it('only resumes bookings that still exist and are not cancelled', () => {
    expect(isResumable('pending')).toBe(true);
    expect(isResumable('confirmed')).toBe(true);
    expect(isResumable('cancelled')).toBe(false);
    expect(isResumable(undefined)).toBe(false);
  });

  it('starts a fresh attempt after the earlier booking was cancelled', () => {
    const sig = flowSignature(FLOW);
    const { store, attempt } = attemptFor({}, sig, NOW);
    const fresh = resetAttempt(recordBooking(store, sig, 'bkg-1'), sig, NOW)[sig]!;
    expect(fresh.key).not.toBe(attempt.key);
    expect(fresh.bookingId).toBeUndefined();
  });

  it('forgets attempts after a day', () => {
    const sig = flowSignature(FLOW);
    const { store } = attemptFor({}, sig, NOW);
    expect(pruneAttempts(store, NOW + ATTEMPT_TTL_MS - 1)[sig]).toBeDefined();
    expect(pruneAttempts(store, NOW + ATTEMPT_TTL_MS)[sig]).toBeUndefined();
  });
});

describe('tap guard on the confirmation screen', () => {
  it('ignores taps right after the screen appears and accepts them afterwards', () => {
    const canTap = createTapGuard(NOW);
    expect(canTap(NOW)).toBe(false);
    expect(canTap(NOW + TAP_GUARD_MS - 1)).toBe(false);
    expect(canTap(NOW + TAP_GUARD_MS)).toBe(true);
  });
});

describe('current slot when rescheduling', () => {
  const slot = (start: string, available = true): TimeSlot => ({
    start,
    end: new Date(Date.parse(start) + 2 * 3_600_000).toISOString(),
    available,
    capacity: available ? 1 : 0,
  });
  const current = '2026-10-20T07:00:00.000Z';

  it('marks the booking’s own window as current even though the API reports it free', () => {
    expect(slotState(slot(current), undefined, current)).toBe('current');
    expect(slotState(slot(current), current, current)).toBe('current');
  });

  it('keeps other windows selectable or booked as before', () => {
    expect(slotState(slot('2026-10-20T09:00:00.000Z'), undefined, current)).toBe('available');
    expect(slotState(slot('2026-10-20T09:00:00.000Z'), '2026-10-20T09:00:00.000Z', current)).toBe(
      'selected',
    );
    expect(slotState(slot('2026-10-20T11:00:00.000Z', false), undefined, current)).toBe(
      'unavailable',
    );
    expect(slotState(slot(current), undefined, undefined)).toBe('available');
  });

  it('does not open a day whose only free window is the current one', () => {
    const open = (slots: TimeSlot[]) =>
      slots.filter((s) => slotState(s, undefined, current) === 'available');
    const days = new Map([
      ['2026-10-20', open([slot(current), slot('2026-10-20T09:00:00.000Z', false)])],
      ['2026-10-21', open([slot('2026-10-21T07:00:00.000Z')])],
    ]);
    expect(firstAvailableDate(['2026-10-20', '2026-10-21'], days)).toBe('2026-10-21');
  });
});
