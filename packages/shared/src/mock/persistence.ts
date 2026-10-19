/**
 * How the demo apps store the simulated database. The mobile app and the admin
 * dashboard use the same key, so when they run on the same web origin they
 * share one demo — a booking made in the customer app appears in admin.
 */
import { HOUR_MS, toMs } from '../domain/time';
import type { MockState } from './state';

export const DEMO_STATE_KEY = 'myhome-demo-state';

/** Demo data is generated relative to "now"; it is re-seeded once it is this old. */
export const DEMO_STATE_MAX_AGE_MS = 12 * HOUR_MS;

/** A stored state if it is readable, current-format and not stale; otherwise undefined. */
export function parseDemoState(raw: string | null | undefined, now: number): MockState | undefined {
  if (!raw) return undefined;
  try {
    const state = JSON.parse(raw) as MockState;
    if (state.version !== 1 || now - toMs(state.seededAt) > DEMO_STATE_MAX_AGE_MS) return undefined;
    return state;
  } catch {
    return undefined;
  }
}
