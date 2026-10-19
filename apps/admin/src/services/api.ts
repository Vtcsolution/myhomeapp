/**
 * The dashboard's API instance: the shared simulated backend, stored under the
 * same key as the mobile app. When both run on one web origin (see
 * vite.config.ts) they share one demo database: every call first adopts the
 * latest saved data, every change is saved at once, and open tabs refresh
 * through the `storage` event (see `createDemoSync`).
 *
 * To connect a real backend, replace `createMockApi(...)` with an HTTP client
 * implementing `MyHomeApi`; pages only use the `api.admin` / `api.auth` contract.
 */
import type { MyHomeApi } from '@myhome/shared';
import {
  createDemoSync,
  createMockApi,
  DEMO_REVISION_KEY,
  type DemoStorage,
} from '@myhome/shared/mock';

/** localStorage, or an in-memory stand-in when the browser blocks storage (private mode). */
function browserStorage(): DemoStorage {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch {
    // Access denied — fall through.
  }
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

const sync = createDemoSync(browserStorage());
const initialState = sync.load(Date.now());

const mock = createMockApi({
  state: initialState,
  latency: { min: 120, max: 320 },
  pullExternal: () => sync.pull(),
  onChange: (state) => sync.push(state),
});

// A freshly generated demo is saved straight away so other open apps adopt it.
if (!initialState) sync.push(mock.exportState());

const listeners = new Set<() => void>();

/** Another tab changed the shared demo data. Returns an unsubscribe function. */
export function onExternalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== DEMO_REVISION_KEY) return;
    const latest = sync.pull();
    if (!latest) return;
    mock.loadState(latest);
    listeners.forEach((listener) => listener());
  });
}

export const api: MyHomeApi = mock;

/** Re-seeds the shared demo data for every app on this origin (signs this tab out). */
export function resetDemoData(): void {
  mock.reset();
}
