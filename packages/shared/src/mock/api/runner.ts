import { ApiError } from '../../api/errors';
import { cloneDeep } from '../state';

export interface Runner {
  /** Runs a read-only operation with simulated latency; returns a detached copy. */
  read<T>(fn: () => T): Promise<T>;
  /** Runs a mutating operation and notifies the persistence hook. */
  write<T>(fn: () => T): Promise<T>;
}

export interface RunnerOptions {
  latency: { min: number; max: number };
  failureRate: number;
  /** Runs before every call (time-based simulation). Returns true if it changed state. */
  beforeEach: () => boolean;
  onChange: () => void;
}

export function createRunner(options: RunnerOptions): Runner {
  const wait = async () => {
    const { min, max } = options.latency;
    const ms = min + Math.random() * Math.max(0, max - min);
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  };

  const execute = async <T>(fn: () => T, mutates: boolean): Promise<T> => {
    await wait();
    if (options.failureRate > 0 && Math.random() < options.failureRate) {
      throw new ApiError('NETWORK', 'Connection problem. Please try again.');
    }
    const simulated = options.beforeEach();
    const result = fn();
    if (mutates || simulated) options.onChange();
    return result === undefined ? result : cloneDeep(result);
  };

  return {
    read: (fn) => execute(fn, false),
    write: (fn) => execute(fn, true),
  };
}
