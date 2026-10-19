/** Web key-value storage backed by localStorage (same API as `storage.ts`). */
export const storage = {
  getItem(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch (error) {
      console.warn(`storage.setItem(${key}) failed`, error);
    }
  },

  removeItem(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Storage unavailable (private mode) — nothing to remove.
    }
  },
};
