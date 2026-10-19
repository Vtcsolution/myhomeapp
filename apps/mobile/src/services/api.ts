/**
 * The single API instance used by every screen.
 *
 * Today this is the simulated backend from `@myhome/shared/mock`, persisted on
 * the device so demo bookings survive restarts. When the real backend exists,
 * replace `createMockApi(...)` with the HTTP client that implements `MyHomeApi`
 * — screens depend only on that interface.
 */
import { HOUR_MS, toMs, type MyHomeApi } from '@myhome/shared';
import { createMockApi, type MockState } from '@myhome/shared/mock';
import { AppState, Platform } from 'react-native';
import { storage } from './storage';

const STATE_KEY = 'myhome-demo-state';
/** Demo data is generated relative to "now"; refresh it once it is this old. */
const MAX_STATE_AGE_MS = 12 * HOUR_MS;
const SAVE_DEBOUNCE_MS = 600;

function loadPersistedState(): MockState | undefined {
  const raw = storage.getItem(STATE_KEY);
  if (!raw) return undefined;
  try {
    const state = JSON.parse(raw) as MockState;
    if (state.version !== 1 || Date.now() - toMs(state.seededAt) > MAX_STATE_AGE_MS)
      return undefined;
    return state;
  } catch {
    return undefined;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: MockState | null = null;

/** Writes any pending change immediately (saves are otherwise debounced). */
export function persistDemoStateNow(): void {
  clearTimeout(saveTimer);
  if (!pending) return;
  void storage.setItem(STATE_KEY, JSON.stringify(pending));
  pending = null;
}

const mock = createMockApi({
  state: loadPersistedState(),
  latency: { min: 160, max: 420 },
  onChange: (state) => {
    pending = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistDemoStateNow, SAVE_DEBOUNCE_MS);
  },
});

// Never lose the last change when the page reloads or the app goes to the background.
if (Platform.OS === 'web') {
  globalThis.addEventListener?.('pagehide', persistDemoStateNow);
} else {
  AppState.addEventListener('change', (status) => {
    if (status !== 'active') persistDemoStateNow();
  });
}

export const api: MyHomeApi = mock;

/** Re-seeds the demonstration data (Account → Reset demo data). */
export function resetDemoData(): void {
  mock.reset();
}
