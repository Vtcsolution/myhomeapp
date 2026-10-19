/**
 * Remembers each checkout attempt on the device, keyed by the flow it belongs
 * to (service, selections, address and time). After a web reload the checkout
 * reuses the same idempotency key, so a repeated submission returns the
 * original booking, and a flow that was already booked offers that booking's
 * confirmation instead of creating another one.
 */
import type { BookingStatus } from '@myhome/shared';
import type { BookingFlowState } from './bookingFlow';
import { newAttemptKey } from './onceGuard';

export interface CheckoutAttempt {
  key: string;
  /** Set once the API has created the booking. */
  bookingId?: string;
  createdAt: number;
}

export type AttemptStore = Record<string, CheckoutAttempt>;

/** Attempts older than this are forgotten. */
export const ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

export function flowSignature(flow: BookingFlowState): string {
  return [flow.serviceId, flow.selections, flow.addressId ?? '', flow.slot ?? ''].join('|');
}

export function pruneAttempts(store: AttemptStore, now: number): AttemptStore {
  return Object.fromEntries(
    Object.entries(store).filter(([, attempt]) => now - attempt.createdAt < ATTEMPT_TTL_MS),
  );
}

/** The attempt for this flow, creating a fresh one when none is remembered. */
export function attemptFor(
  store: AttemptStore,
  signature: string,
  now: number,
): { store: AttemptStore; attempt: CheckoutAttempt } {
  const pruned = pruneAttempts(store, now);
  const existing = pruned[signature];
  if (existing) return { store: pruned, attempt: existing };
  const attempt: CheckoutAttempt = { key: newAttemptKey(), createdAt: now };
  return { store: { ...pruned, [signature]: attempt }, attempt };
}

export function recordBooking(
  store: AttemptStore,
  signature: string,
  bookingId: string,
): AttemptStore {
  const attempt = store[signature];
  return attempt ? { ...store, [signature]: { ...attempt, bookingId } } : store;
}

/** Starts over for this flow (e.g. the earlier booking was cancelled). */
export function resetAttempt(store: AttemptStore, signature: string, now: number): AttemptStore {
  return { ...store, [signature]: { key: newAttemptKey(), createdAt: now } };
}

/** A previous booking from this flow is shown instead of booking again unless it was cancelled. */
export function isResumable(status: BookingStatus | undefined): boolean {
  return status !== undefined && status !== 'cancelled';
}
