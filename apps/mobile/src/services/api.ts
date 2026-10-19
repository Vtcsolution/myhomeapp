/**
 * The single API instance used by every screen.
 *
 * Today this is the simulated backend from `@myhome/shared/mock`, persisted on
 * the device so demo bookings survive restarts. When the real backend exists,
 * replace `createMockApi(...)` with the HTTP client that implements `MyHomeApi`
 * — screens depend only on that interface.
 */
import type { MyHomeApi } from '@myhome/shared';
import { createMockApi, DEMO_STATE_KEY, type MockState, parseDemoState } from '@myhome/shared/mock';
import { AppState, Platform } from 'react-native';
import { storage } from './storage';

/** Web saves quickly so another tab (e.g. the admin dashboard) sees changes promptly. */
const SAVE_DEBOUNCE_MS = Platform.OS === 'web' ? 150 : 600;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: MockState | null = null;

/** Writes any pending change immediately (saves are otherwise debounced). */
export function persistDemoStateNow(): void {
  clearTimeout(saveTimer);
  if (!pending) return;
  void storage.setItem(DEMO_STATE_KEY, JSON.stringify(pending));
  pending = null;
}

const mock = createMockApi({
  state: parseDemoState(storage.getItem(DEMO_STATE_KEY), Date.now()),
  latency: { min: 160, max: 420 },
  onChange: (state) => {
    pending = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistDemoStateNow, SAVE_DEBOUNCE_MS);
  },
});

const externalListeners = new Set<() => void>();

/**
 * Called when another tab on the same web origin (the admin dashboard or a
 * second app tab) changed the shared demo data. Returns an unsubscribe function.
 */
export function onExternalDemoChange(listener: () => void): () => void {
  externalListeners.add(listener);
  return () => externalListeners.delete(listener);
}

// Never lose the last change when the page reloads or the app goes to the background.
if (Platform.OS === 'web') {
  globalThis.addEventListener?.('pagehide', persistDemoStateNow);
  // Adopt changes written by another tab, keeping this app's own session.
  globalThis.addEventListener?.('storage', (event: StorageEvent) => {
    if (event.key !== DEMO_STATE_KEY) return;
    const state = parseDemoState(event.newValue, Date.now());
    if (!state) return;
    clearTimeout(saveTimer);
    pending = null;
    mock.loadState(state);
    externalListeners.forEach((listener) => listener());
  });
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
