/**
 * Native key-value storage backed by files in the app's document directory.
 * Reads are synchronous so the app can restore preferences and demo data
 * before the first frame. (Web uses `storage.web.ts`.)
 */
import { File, Paths } from 'expo-file-system';

const fileFor = (key: string) => new File(Paths.document, `${key}.json`);

export const storage = {
  getItem(key: string): string | null {
    try {
      const file = fileFor(key);
      return file.exists ? file.textSync() : null;
    } catch (error) {
      console.warn(`storage.getItem(${key}) failed`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const file = fileFor(key);
      if (!file.exists) file.create();
      await file.write(value);
    } catch (error) {
      console.warn(`storage.setItem(${key}) failed`, error);
    }
  },

  removeItem(key: string): void {
    try {
      const file = fileFor(key);
      if (file.exists) file.delete();
    } catch (error) {
      console.warn(`storage.removeItem(${key}) failed`, error);
    }
  },
};
