import type { MyHomeApi } from '../../api/contracts';
import { businessConfig } from '../../brand/business.config';
import { toMs } from '../../domain/time';
import { createSeedState } from '../seed';
import { cloneDeep, type MockState } from '../state';
import { createAdminApi } from './admin';
import { createAuthApi } from './auth';
import { createCatalogApi } from './catalog';
import type { MockContext } from './context';
import { createCustomerAccountApi, createCustomerBookingsApi } from './customer';
import { runAutoConfirm } from './dispatch';
import { createChatApi, createNotificationsApi, createSupportApi } from './engagement';
import { createRunner } from './runner';
import { runSimulatedReplies } from './simulation';
import { createTechnicianApi } from './technician';

export interface MockApiOptions {
  /** Restore a previously exported state (e.g. from device storage). */
  state?: MockState;
  /** Clock override, mainly for tests. */
  now?: () => number;
  /** Simulated network latency in ms (number = fixed). Default 250–650 ms. */
  latency?: number | { min: number; max: number };
  /** Probability (0–1) of a simulated network failure. Default 0. */
  failureRate?: number;
  /**
   * Seconds after which a booking created through the API is accepted by an
   * offered technician. `null` disables the simulation. Default 20.
   */
  autoConfirmAfterSec?: number | null;
  /**
   * Seconds before the simulation answers a chat message or support request
   * (clearly marked as automatic). `null` disables it. Default 6.
   */
  simulatedReplyAfterSec?: number | null;
  /** Called after every state change — hook for persistence. */
  onChange?: (state: MockState) => void;
}

export interface MockApi extends MyHomeApi {
  /** A detached copy of the full state, safe to serialise. */
  exportState(): MockState;
  /** Re-seeds the demo data relative to the current time and signs out. */
  reset(): void;
}

/**
 * Creates the simulated backend. All data lives in memory; nothing is sent
 * over the network and no payments, SMS or emails are real.
 */
export function createMockApi(options: MockApiOptions = {}): MockApi {
  const now = options.now ?? (() => Date.now());
  const latency =
    typeof options.latency === 'number'
      ? { min: options.latency, max: options.latency }
      : (options.latency ?? { min: 250, max: 650 });
  const autoConfirmAfterSec =
    options.autoConfirmAfterSec === undefined ? 20 : options.autoConfirmAfterSec;

  let sequence = 0;
  const ctx: MockContext = {
    state: options.state ? cloneDeep(options.state) : createSeedState({ now: now() }),
    now,
    nowISO: () => new Date(now()).toISOString(),
    nextId: (prefix) => {
      ctx.state.sequence += 1;
      sequence = ctx.state.sequence;
      return `${prefix}-${sequence}`;
    },
    config: businessConfig,
    replyDelaySec:
      options.simulatedReplyAfterSec === undefined ? 6 : options.simulatedReplyAfterSec,
  };

  const run = createRunner({
    latency,
    failureRate: options.failureRate ?? 0,
    beforeEach: () => {
      const session = ctx.state.session;
      let changed = false;
      if (session && toMs(session.expiresAt) <= now()) {
        ctx.state.session = null;
        changed = true;
      }
      const confirmed = runAutoConfirm(ctx, autoConfirmAfterSec);
      const replied = runSimulatedReplies(ctx);
      return confirmed || replied || changed;
    },
    onChange: () => options.onChange?.(ctx.state),
  });

  return {
    auth: createAuthApi(ctx, run),
    catalog: createCatalogApi(ctx, run),
    bookings: createCustomerBookingsApi(ctx, run),
    account: createCustomerAccountApi(ctx, run),
    notifications: createNotificationsApi(ctx, run),
    chat: createChatApi(ctx, run),
    support: createSupportApi(ctx, run),
    technician: createTechnicianApi(ctx, run),
    admin: createAdminApi(ctx, run),
    exportState: () => cloneDeep(ctx.state),
    reset: () => {
      ctx.state = createSeedState({ now: now() });
      options.onChange?.(ctx.state);
    },
  };
}
