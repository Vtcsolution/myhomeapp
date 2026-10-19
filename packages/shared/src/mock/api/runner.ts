import { ApiError } from '../../api/errors';
import { cloneDeep } from '../state';

export interface WriteOptions {
  /**
   * Keep changes made before an error instead of rolling them back — for
   * deliberate side effects of a failed call (e.g. counting a wrong OTP attempt).
   */
  commitOnError?: boolean;
}

export interface Runner {
  /** Runs a read-only operation with simulated latency; returns a detached copy. */
  read<T>(fn: () => T): Promise<T>;
  /**
   * Runs a mutating operation and notifies the persistence hook. All or
   * nothing: if it throws, every change it made is rolled back.
   */
  write<T>(fn: () => T, options?: WriteOptions): Promise<T>;
}

export interface RunnerOptions<S> {
  latency: { min: number; max: number };
  failureRate: number;
  /** Adopts newer data written elsewhere (another tab) before the call runs. */
  refresh?: () => void;
  /** Runs before every call (time-based simulation). Returns true if it changed state. */
  beforeEach: () => boolean;
  /** Snapshot and restore of the whole state, for rolling back a failed write. */
  snapshot: () => S;
  restore: (snapshot: S) => void;
  onChange: () => void;
}

export function createRunner<S>(options: RunnerOptions<S>): Runner {
  const wait = async () => {
    const { min, max } = options.latency;
    const ms = min + Math.random() * Math.max(0, max - min);
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  };

  const execute = async <T>(
    fn: () => T,
    mutates: boolean,
    writeOptions: WriteOptions = {},
  ): Promise<T> => {
    await wait();
    if (options.failureRate > 0 && Math.random() < options.failureRate) {
      throw new ApiError('NETWORK', 'Connection problem. Please try again.');
    }
    // Everything below runs synchronously, so no other call can interleave.
    options.refresh?.();
    const simulated = options.beforeEach();
    const before = mutates && !writeOptions.commitOnError ? options.snapshot() : undefined;
    let result: T;
    try {
      result = fn();
    } catch (error) {
      if (before !== undefined) options.restore(before);
      if (simulated || (mutates && writeOptions.commitOnError)) options.onChange();
      throw error;
    }
    if (mutates || simulated) options.onChange();
    return result === undefined ? result : cloneDeep(result);
  };

  return {
    read: (fn) => execute(fn, false),
    write: (fn, writeOptions) => execute(fn, true, writeOptions),
  };
}
