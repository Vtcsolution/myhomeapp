/**
 * Wraps an async action so that repeated calls while it is running are
 * ignored — a second tap on "Confirm booking" cannot start a second request.
 * Paired with the API idempotency key, this prevents duplicate bookings.
 */
export function createOnceGuard<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  let inFlight: Promise<R> | null = null;
  const run = (...args: A): Promise<R> => {
    if (inFlight) return inFlight;
    inFlight = action(...args).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  return Object.assign(run, { isRunning: () => inFlight !== null });
}

/** Unique key for one checkout attempt (sent as the API idempotency key). */
export function newAttemptKey(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `attempt-${Date.now().toString(36)}-${random}`;
}
