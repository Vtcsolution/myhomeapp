import { type AppNotification, kuwaitDateOf } from '@myhome/shared';

export type NotificationFilter = 'all' | 'unread';
export type DayBucket = 'today' | 'yesterday' | 'earlier';

export interface NotificationGroup {
  bucket: DayBucket;
  items: AppNotification[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today / Yesterday / Earlier by Kuwait calendar day, keeping the given order. */
export function groupNotifications(
  notifications: readonly AppNotification[],
  filter: NotificationFilter,
  now: number,
): NotificationGroup[] {
  const today = kuwaitDateOf(now);
  const yesterday = kuwaitDateOf(now - DAY_MS);
  const buckets: Record<DayBucket, AppNotification[]> = { today: [], yesterday: [], earlier: [] };
  for (const n of notifications) {
    if (filter === 'unread' && n.read) continue;
    const day = kuwaitDateOf(n.createdAt);
    buckets[day === today ? 'today' : day === yesterday ? 'yesterday' : 'earlier'].push(n);
  }
  return (['today', 'yesterday', 'earlier'] as const)
    .map((bucket) => ({ bucket, items: buckets[bucket] }))
    .filter((g) => g.items.length > 0);
}

export type NotificationTarget =
  | { kind: 'chat'; id: string }
  | { kind: 'ticket'; id: string }
  | { kind: 'booking'; id: string }
  | null;

/** Where tapping a notification leads: the conversation, the request, or the booking. */
export function notificationTarget(n: AppNotification): NotificationTarget {
  if (n.threadId) return { kind: 'chat', id: n.threadId };
  if (n.ticketId) return { kind: 'ticket', id: n.ticketId };
  if (n.bookingId) return { kind: 'booking', id: n.bookingId };
  return null;
}
