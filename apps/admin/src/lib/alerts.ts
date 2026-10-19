/**
 * Operational alerts for the top-bar bell and the overview, built from the
 * dashboard's live counts and the admin's alert preferences.
 */
import type { AdminDashboard } from '@myhome/shared';
import type { AlertPreferences } from '@/services/preferences';

export type AlertKey = keyof AlertPreferences;

export interface AlertItem {
  key: AlertKey;
  count: number;
  /** Where to act on it (a pre-filtered list). */
  href: string;
  tone: 'warning' | 'danger' | 'info';
}

const TARGET: Record<AlertKey, { href: string; tone: AlertItem['tone'] }> = {
  unassignedSoon: { href: '/bookings?status=pending&sort=scheduled_asc', tone: 'danger' },
  pendingExtraCharges: { href: '/bookings?status=arrived&status=in_progress', tone: 'warning' },
  openTickets: { href: '/tickets?status=unresolved', tone: 'info' },
  flaggedReviews: { href: '/reviews?status=flagged', tone: 'warning' },
  documentsExpiring: { href: '/technicians?attention=documents', tone: 'warning' },
  payoutsDue: { href: '/payouts?view=due', tone: 'info' },
  pendingApprovals: { href: '/technicians?status=pending_approval', tone: 'info' },
};

/** Most urgent first; alerts that are switched off or have nothing to show are omitted. */
export function buildAlerts(
  dashboard: Pick<AdminDashboard, 'alerts' | 'kpis'>,
  prefs: AlertPreferences,
): AlertItem[] {
  const counts: Record<AlertKey, number> = {
    ...dashboard.alerts,
    pendingApprovals: dashboard.kpis.pendingApprovals,
  };
  const order: AlertKey[] = [
    'unassignedSoon',
    'pendingExtraCharges',
    'payoutsDue',
    'pendingApprovals',
    'documentsExpiring',
    'flaggedReviews',
    'openTickets',
  ];
  return order
    .filter((key) => prefs[key] && counts[key] > 0)
    .map((key) => ({ key, count: counts[key], ...TARGET[key] }));
}
