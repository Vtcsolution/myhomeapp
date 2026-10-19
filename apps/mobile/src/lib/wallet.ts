import { toKuwaitParts, type WalletTransactionView } from '@myhome/shared';

export type WalletFilter = 'all' | 'credits' | 'debits';

export function filterTransactions(
  transactions: readonly WalletTransactionView[],
  filter: WalletFilter,
): WalletTransactionView[] {
  if (filter === 'credits') return transactions.filter((t) => t.amount > 0);
  if (filter === 'debits') return transactions.filter((t) => t.amount < 0);
  return [...transactions];
}

export interface MonthGroup {
  /** `YYYY-MM` in Kuwait time. */
  month: string;
  /** Mid-month ISO date, convenient for formatting the heading. */
  sample: string;
  transactions: WalletTransactionView[];
}

/** Groups (already newest-first) movements by Kuwait calendar month. */
export function groupByMonth(transactions: readonly WalletTransactionView[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const t of transactions) {
    const { year, month } = toKuwaitParts(t.createdAt);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const last = groups[groups.length - 1];
    if (last && last.month === key) last.transactions.push(t);
    else groups.push({ month: key, sample: t.createdAt, transactions: [t] });
  }
  return groups;
}
