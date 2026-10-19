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

/**
 * A stored state if it is readable, current-format and not stale; otherwise
 * undefined. `now: null` skips the age check (live sync between open apps must
 * keep working however long the demo has been running).
 */
export function parseDemoState(
  raw: string | null | undefined,
  now: number | null,
): MockState | undefined {
  if (!raw) return undefined;
  try {
    const state = JSON.parse(raw) as MockState;
    if (state.version !== 1) return undefined;
    if (now !== null && now - toMs(state.seededAt) > DEMO_STATE_MAX_AGE_MS) return undefined;
    return state;
  } catch {
    return undefined;
  }
}

/** Revision of the stored demo state; bumped on every save so apps notice changes cheaply. */
export const DEMO_REVISION_KEY = 'myhome-demo-revision';

/** Synchronous key-value storage (web localStorage, or an in-memory test double). */
export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DemoSync {
  /** The stored state to start from, if it is usable. */
  load(now: number): MockState | undefined;
  /**
   * A state saved by another app or tab since this one last loaded or saved,
   * or undefined. Only the small revision key is read unless something changed.
   */
  pull(): MockState | undefined;
  /** Saves the state and bumps the revision. */
  push(state: MockState): void;
}

/**
 * Keeps several apps (customer, professional, admin) that share one browser
 * origin on the same demo database. Each API call first pulls a newer saved
 * state, then saves its own change straight away, so one tab never silently
 * overwrites another's change. This is a demo convenience on one device —
 * not multi-device synchronisation.
 */
export function createDemoSync(storage: DemoStorage): DemoSync {
  const readRevision = () => {
    try {
      return Number(storage.getItem(DEMO_REVISION_KEY)) || 0;
    } catch {
      return 0;
    }
  };
  let revision = 0;

  const readState = (now: number | null) => {
    try {
      return parseDemoState(storage.getItem(DEMO_STATE_KEY), now);
    } catch {
      return undefined;
    }
  };

  return {
    load: (now) => {
      revision = readRevision();
      return readState(now);
    },
    pull: () => {
      const stored = readRevision();
      if (stored <= revision) return undefined;
      revision = stored;
      return readState(null);
    },
    push: (state) => {
      revision = Math.max(revision, readRevision()) + 1;
      try {
        storage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
        storage.setItem(DEMO_REVISION_KEY, String(revision));
      } catch (error) {
        console.warn('Could not save the demo data', error);
      }
    },
  };
}
