import type { Locale, Session } from '@myhome/shared';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Which operational alerts the top-bar bell shows (stored in this browser only). */
export interface AlertPreferences {
  unassignedSoon: boolean;
  pendingExtraCharges: boolean;
  openTickets: boolean;
  flaggedReviews: boolean;
  documentsExpiring: boolean;
  payoutsDue: boolean;
  pendingApprovals: boolean;
}

export interface AdminPreferences {
  locale: Locale;
  theme: ThemePreference;
  session: Session | null;
  alerts: AlertPreferences;
  /** Rows per page in tables. */
  pageSize: number;
}

/** Separate from the mobile app's preferences so each app keeps its own session. */
const KEY = 'myhome-admin-preferences';

export const defaultAlerts: AlertPreferences = {
  unassignedSoon: true,
  pendingExtraCharges: true,
  openTickets: true,
  flaggedReviews: true,
  documentsExpiring: true,
  payoutsDue: true,
  pendingApprovals: true,
};

const defaults: AdminPreferences = {
  locale: 'en',
  theme: 'system',
  session: null,
  alerts: defaultAlerts,
  pageSize: 20,
};

let cache: AdminPreferences | null = null;

function read(): Partial<AdminPreferences> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<AdminPreferences>) : {};
  } catch {
    return {};
  }
}

export function readPreferences(): AdminPreferences {
  if (cache) return cache;
  const stored = read();
  cache = { ...defaults, ...stored, alerts: { ...defaultAlerts, ...stored.alerts } };
  return cache;
}

export function writePreferences(patch: Partial<AdminPreferences>): AdminPreferences {
  cache = { ...readPreferences(), ...patch };
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage unavailable (private mode) — preferences last for this visit only.
  }
  return cache;
}
