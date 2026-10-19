/**
 * `@myhome/shared/mock` — the simulated backend used by the frontend demo.
 * Replace `createMockApi()` with the real HTTP client once the backend exists;
 * both implement `MyHomeApi`.
 */
export { createMockApi, type MockApi, type MockApiOptions } from './api/createMockApi';
export { createSeedState, type SeedOptions } from './seed';
export type { MockState } from './state';
export { DEMO_ACCOUNTS } from './data/people';
export {
  createDemoSync,
  DEMO_REVISION_KEY,
  DEMO_STATE_KEY,
  DEMO_STATE_MAX_AGE_MS,
  type DemoStorage,
  type DemoSync,
  parseDemoState,
} from './persistence';
