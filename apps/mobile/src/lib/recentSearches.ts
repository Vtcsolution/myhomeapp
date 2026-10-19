import { normalizeSearchText } from '@myhome/shared';

export const MAX_RECENT_SEARCHES = 6;

/**
 * Adds a query to the front of the recent list, ignoring blanks and replacing
 * equivalent earlier entries (case, diacritics and Arabic letter variants).
 */
export function addRecentSearch(
  list: readonly string[],
  query: string,
  max = MAX_RECENT_SEARCHES,
): string[] {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return [...list];
  const key = normalizeSearchText(trimmed);
  return [trimmed, ...list.filter((q) => normalizeSearchText(q) !== key)].slice(0, max);
}

export function parseRecentSearches(raw: string | null): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}
