/** Small deterministic PRNG (mulberry32) so seeded demo data is identical on every run. */
export interface Rng {
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  sample<T>(items: readonly T[], count: number): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => {
    if (!items.length) throw new Error('pick() from empty list');
    return items[int(0, items.length - 1)] as T;
  };
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick,
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [item, weight] of items) {
        roll -= weight;
        if (roll < 0) return item;
      }
      const last = items[items.length - 1];
      if (!last) throw new Error('weighted() from empty list');
      return last[0];
    },
    sample: <T>(items: readonly T[], count: number): T[] => {
      const pool = [...items];
      const out: T[] = [];
      while (pool.length && out.length < count)
        out.push(pool.splice(int(0, pool.length - 1), 1)[0] as T);
      return out;
    },
  };
}

/** FNV-1a string hash — stable per-entity randomness (e.g. address jitter). */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
