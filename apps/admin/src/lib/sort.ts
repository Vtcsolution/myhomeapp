/** Client-side sorting for tables whose API returns the full list. */
export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

export type SortValue = string | number | null | undefined;

/** Stable sort; empty values always go last, strings compare with the given locale. */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K> | null,
  value: (row: T, key: K) => SortValue,
  locale = 'en',
): T[] {
  if (!sort) return [...rows];
  const factor = sort.direction === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return rows
    .map((row, index) => ({ row, index, v: value(row, sort.key) }))
    .sort((a, b) => {
      const aEmpty = a.v === null || a.v === undefined || a.v === '';
      const bEmpty = b.v === null || b.v === undefined || b.v === '';
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      const cmp =
        typeof a.v === 'number' && typeof b.v === 'number'
          ? a.v - b.v
          : collator.compare(String(a.v), String(b.v));
      return cmp === 0 ? a.index - b.index : cmp * factor;
    })
    .map((x) => x.row);
}

/** Clicking a column: first descending for numbers/dates feels natural, toggles after. */
export function nextSort<K extends string>(current: SortState<K> | null, key: K): SortState<K> {
  if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  return { key, direction: 'desc' };
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return {
    items: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pages,
    total: rows.length,
  };
}
