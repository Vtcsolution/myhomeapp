/**
 * Jobs that need the professional's attention on the dashboard: work under
 * way, extra work waiting for the customer, and visits starting soon.
 */
import { type Booking, isLiveStatus, toMs } from '@myhome/shared';

export type AttentionReason = 'live' | 'extra' | 'soon';

export interface AttentionItem<J extends Booking> {
  job: J;
  reason: AttentionReason;
}

/** A confirmed visit starting within this window counts as "soon". */
export const SOON_MS = 3 * 60 * 60 * 1000;

export function attentionItems<J extends Booking>(
  jobs: readonly J[],
  now: number,
): AttentionItem<J>[] {
  const items: AttentionItem<J>[] = [];
  for (const job of jobs) {
    if (job.extraCharges.some((c) => c.status === 'pending_approval')) {
      items.push({ job, reason: 'extra' });
    } else if (isLiveStatus(job.status)) {
      items.push({ job, reason: 'live' });
    } else if (job.status === 'confirmed') {
      const start = toMs(job.scheduledStart);
      if (start >= now && start - now <= SOON_MS) items.push({ job, reason: 'soon' });
    }
  }
  const rank: Record<AttentionReason, number> = { extra: 0, live: 1, soon: 2 };
  return items.sort(
    (a, b) =>
      rank[a.reason] - rank[b.reason] || toMs(a.job.scheduledStart) - toMs(b.job.scheduledStart),
  );
}
