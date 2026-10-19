import { describe, expect, it } from 'vitest';
import { DEMO_STATE_MAX_AGE_MS, parseDemoState } from './persistence';
import { createSeedState } from './seed';

const NOW = Date.parse('2026-10-19T07:30:00.000Z');

describe('stored demo state', () => {
  const state = createSeedState({ now: NOW });
  const raw = JSON.stringify(state);

  it('restores a current state', () => {
    expect(parseDemoState(raw, NOW + 60_000)?.bookings.length).toBe(state.bookings.length);
  });

  it('re-seeds when the data is stale, from another version, unreadable or missing', () => {
    expect(parseDemoState(raw, NOW + DEMO_STATE_MAX_AGE_MS + 1)).toBeUndefined();
    expect(parseDemoState(JSON.stringify({ ...state, version: 2 }), NOW)).toBeUndefined();
    expect(parseDemoState('{not json', NOW)).toBeUndefined();
    expect(parseDemoState(null, NOW)).toBeUndefined();
  });
});
