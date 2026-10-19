/**
 * The dashboard's API instance: the shared simulated backend, stored under the
 * same key as the mobile app. When both run on one web origin (see
 * vite.config.ts) they share one demo database, and each tab adopts the
 * other's changes through the `storage` event.
 *
 * To connect a real backend, replace `createMockApi(...)` with an HTTP client
 * implementing `MyHomeApi`; pages only use the `api.admin` / `api.auth` contract.
 */
import type { MyHomeApi } from '@myhome/shared';
import { createMockApi, DEMO_STATE_KEY, type MockState, parseDemoState } from '@myhome/shared/mock';

const SAVE_DEBOUNCE_MS = 150;

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(DEMO_STATE_KEY) ?? null;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: MockState | null = null;

export function persistNow(): void {
  clearTimeout(saveTimer);
  if (!pending) return;
  try {
    globalThis.localStorage?.setItem(DEMO_STATE_KEY, JSON.stringify(pending));
  } catch (error) {
    console.warn('Could not save the demo data', error);
  }
  pending = null;
}

const mock = createMockApi({
  state: parseDemoState(readStored(), Date.now()),
  latency: { min: 120, max: 320 },
  onChange: (state) => {
    pending = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, SAVE_DEBOUNCE_MS);
  },
});

const listeners = new Set<() => void>();

/** Another tab changed the shared demo data. Returns an unsubscribe function. */
export function onExternalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistNow);
  window.addEventListener('storage', (event) => {
    if (event.key !== DEMO_STATE_KEY) return;
    const state = parseDemoState(event.newValue, Date.now());
    if (!state) return;
    clearTimeout(saveTimer);
    pending = null;
    mock.loadState(state);
    listeners.forEach((listener) => listener());
  });
}

export const api: MyHomeApi = mock;

/** Re-seeds the shared demo data for every app on this origin (signs this tab out). */
export function resetDemoData(): void {
  mock.reset();
  persistNow();
}
