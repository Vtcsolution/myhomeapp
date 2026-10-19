import {
  type AttemptStore,
  attemptFor,
  type CheckoutAttempt,
  recordBooking,
  resetAttempt,
} from '@/lib/checkoutAttempts';
import { storage } from './storage';

const KEY = 'myhome-checkout-attempts';

function read(): AttemptStore {
  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AttemptStore) : {};
  } catch {
    return {};
  }
}

function write(store: AttemptStore): void {
  void storage.setItem(KEY, JSON.stringify(store));
}

/** The remembered attempt for a checkout flow (created on first use). */
export function loadAttempt(signature: string): CheckoutAttempt {
  const { store, attempt } = attemptFor(read(), signature, Date.now());
  write(store);
  return attempt;
}

export function rememberBooking(signature: string, bookingId: string): void {
  write(recordBooking(read(), signature, bookingId));
}

export function startNewAttempt(signature: string): CheckoutAttempt {
  const store = resetAttempt(read(), signature, Date.now());
  write(store);
  return store[signature]!;
}
