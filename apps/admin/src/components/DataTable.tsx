import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { type SortState } from '@/lib/sort';
import { useLocale } from '@/providers/LocaleProvider';
import { Button, EmptyState, LoadingRows } from './ui';

export interface Column<T, K extends string = string> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the header a sort button. */
  sortKey?: K;
  align?: 'end';
  /** Hidden on phones to keep the table readable. */
  hideOnSmall?: boolean;
  width?: number | string;
}

/**
 * Accessible data table: real <table> semantics, sortable headers announce
 * their state (aria-sort), and rows open with Enter as well as a click.
 * Wide tables scroll horizontally inside their card, never the page.
 */
export function DataTable<T, K extends string = string>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  sort,
  onSort,
  loading,
  empty,
  caption,
}: {
  columns: Column<T, K>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible name for a clickable row. */
  rowLabel?: (row: T) => string;
  sort?: SortState<K> | null;
  onSort?: (key: K) => void;
  loading?: boolean;
  empty?: ReactNode;
  caption: string;
}) {
  if (loading && !rows) return <LoadingRows />;
  if (rows && rows.length === 0) return <>{empty ?? <EmptyState title="—" />}</>;
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort && col.sortKey && sort.key === col.sortKey;
              const ariaSort = active
                ? sort!.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined;
              const SortIcon = active
                ? sort!.direction === 'asc'
                  ? ArrowUp
                  : ArrowDown
                : ArrowUpDown;
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={[col.align === 'end' && 'end', col.hideOnSmall && 'hide-sm']
                    .filter(Boolean)
                    .join(' ')}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.sortKey && onSort ? (
                    <button
                      type="button"
                      className="sort-btn"
                      data-active={active ? 'true' : 'false'}
                      onClick={() => onSort(col.sortKey!)}
                    >
                      {col.header}
                      <SortIcon size={12} aria-hidden />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody style={{ opacity: loading ? 0.6 : 1 }}>
          {(rows ?? []).map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'is-link' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row);
                    }
                  : undefined
              }
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={[col.align === 'end' && 'end num', col.hideOnSmall && 'hide-sm']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t, dir } = useLocale();
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="num">{t('common.showing', { from, to, total })}</span>
      <span className="spacer" />
      <Button
        size="sm"
        variant="ghost"
        icon={Prev}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t('common.previous')}
      </Button>
      <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('common.next')}
        <Next size={16} aria-hidden />
      </Button>
    </nav>
  );
}
