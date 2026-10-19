import { useCallback, useState } from 'react';
import { addRecentSearch, parseRecentSearches } from '@/lib/recentSearches';
import { storage } from './storage';

const KEY = 'myhome-recent-searches';

/** Recent searches kept on this device only (never sent anywhere). */
export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(() => parseRecentSearches(storage.getItem(KEY)));

  const remember = useCallback((query: string) => {
    setItems((current) => {
      const next = addRecentSearch(current, query);
      void storage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    storage.removeItem(KEY);
  }, []);

  return { items, remember, clear };
}
