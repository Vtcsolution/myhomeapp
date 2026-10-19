/**
 * Ignores presses for a short time after a screen appears. A fast double tap
 * on "Confirm booking" would otherwise land on whichever button replaces it at
 * the same position on the next screen (e.g. "Back to home").
 */
export const TAP_GUARD_MS = 700;

export function createTapGuard(shownAt: number, guardMs = TAP_GUARD_MS) {
  return (now: number): boolean => now - shownAt >= guardMs;
}
