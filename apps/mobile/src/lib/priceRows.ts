/**
 * Turns a shared `PriceBreakdown` into display rows. This module performs no
 * arithmetic: every amount is copied from the breakdown produced by the
 * shared pricing engine, so the UI can never disagree with the API.
 */
import type { Fils, LocalizedText, PriceBreakdown } from '@myhome/shared';

export type PriceRow =
  | {
      kind: 'item';
      key: string;
      label: LocalizedText;
      quantity: number;
      amount: Fils;
      extra: boolean;
    }
  | { kind: 'subtotal'; key: 'subtotal'; amount: Fils }
  | { kind: 'visitFee'; key: 'visitFee'; amount: Fils; waived: boolean }
  | { kind: 'discount'; key: 'discount'; code: string | undefined; amount: Fils }
  | { kind: 'tax'; key: 'tax'; amount: Fils }
  | { kind: 'total'; key: 'total'; amount: Fils };

export function priceRows(price: PriceBreakdown): PriceRow[] {
  const rows: PriceRow[] = price.items.map((item, index) => ({
    kind: 'item',
    key: `${item.kind}-${item.refId ?? index}`,
    label: item.label,
    quantity: item.quantity,
    amount: item.total,
    extra: item.kind === 'extra',
  }));
  rows.push({ kind: 'subtotal', key: 'subtotal', amount: price.subtotal });
  rows.push({
    kind: 'visitFee',
    key: 'visitFee',
    amount: price.visitFee,
    waived: price.visitFee === 0,
  });
  if (price.discount > 0)
    rows.push({
      kind: 'discount',
      key: 'discount',
      code: price.couponCode,
      amount: -price.discount,
    });
  if (price.tax > 0) rows.push({ kind: 'tax', key: 'tax', amount: price.tax });
  rows.push({ kind: 'total', key: 'total', amount: price.total });
  return rows;
}
