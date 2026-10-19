/**
 * The single API instance used by every screen.
 *
 * Today this is the simulated backend from `@myhome/shared/mock`, persisted on
 * the device so demo bookings survive restarts. When the real backend exists,
 * replace `createMockApi(...)` with the HTTP client that implements `MyHomeApi`
 * — screens depend only on that interface.
 */
import type { MyHomeApi } from '@myhome/shared';
import {
  createDemoSync,
  createMockApi,
  DEMO_REVISION_KEY,
  DEMO_STATE_KEY,
  type DemoSync,
  type MockState,
  parseDemoState,
} from '@myhome/shared/mock';
import { AppState, Platform } from 'react-native';
import { storage } from './storage';

/**
 * Web: several apps can be open on one origin (customer, professional and the
 * admin dashboard), so every call first adopts the latest saved data and every
 * change is saved at once (see `createDemoSync`). Native: one app owns the
 * data, so saves to the file are batched.
 */
const webSync: DemoSync | null =
  Platform.OS === 'web' && globalThis.localStorage ? createDemoSync(globalThis.localStorage) : null;

const NATIVE_SAVE_DEBOUNCE_MS = 600;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: MockState | null = null;

/** Writes any pending change immediately (native saves are otherwise batched). */
export function persistDemoStateNow(): void {
  clearTimeout(saveTimer);
  if (!pending) return;
  void storage.setItem(DEMO_STATE_KEY, JSON.stringify(pending));
  pending = null;
}

const initialState = webSync
  ? webSync.load(Date.now())
  : parseDemoState(storage.getItem(DEMO_STATE_KEY), Date.now());

const mock = createMockApi({
  state: initialState,
  latency: { min: 160, max: 420 },
  pullExternal: webSync ? () => webSync.pull() : undefined,
  onChange: (state) => {
    if (webSync) {
      webSync.push(state);
      return;
    }
    pending = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistDemoStateNow, NATIVE_SAVE_DEBOUNCE_MS);
  },
});

// A freshly generated demo is saved straight away so other open apps adopt it.
if (webSync && !initialState) webSync.push(mock.exportState());

const externalListeners = new Set<() => void>();

/**
 * Called when another tab on the same web origin (the admin dashboard or a
 * second app tab) changed the shared demo data. Returns an unsubscribe function.
 */
export function onExternalDemoChange(listener: () => void): () => void {
  externalListeners.add(listener);
  return () => externalListeners.delete(listener);
}

if (webSync) {
  // Another tab saved: adopt its data (keeping this app's session) and refresh screens.
  globalThis.addEventListener?.('storage', (event: StorageEvent) => {
    if (event.key !== DEMO_REVISION_KEY) return;
    const latest = webSync.pull();
    if (!latest) return;
    mock.loadState(latest);
    externalListeners.forEach((listener) => listener());
  });
} else {
  // Never lose the last change when the app goes to the background.
  AppState.addEventListener('change', (status) => {
    if (status !== 'active') persistDemoStateNow();
  });
}

export const api: MyHomeApi = mock;

/** Re-seeds the demonstration data (Account → Reset demo data). */
export function resetDemoData(): void {
  mock.reset();
  persistDemoStateNow();
}
