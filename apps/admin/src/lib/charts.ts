import type { BookingStatus, StatusTone } from '@myhome/shared';
import { bookingStatusTone } from '@myhome/shared';

/** CSS colour for a status tone (charts use the same tones as badges). */
export const toneColor: Record<StatusTone, string> = {
  neutral: 'var(--text-muted)',
  info: 'var(--info)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

export const statusColor = (status: BookingStatus) => toneColor[bookingStatusTone[status]];

/** Percentage change between two values, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export function formatChange(change: number | null): string {
  if (change === null) return '—';
  const pct = Math.round(change * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}
