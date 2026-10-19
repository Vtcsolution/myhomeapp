import type { Locale, Session } from '@myhome/shared';
import { storage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Small, device-local preferences. In production the session token would live
 * in secure storage; the demo keeps everything in one simulated store.
 */
/** Which notifications the customer wants (stored on this device only). */
export interface NotificationPreferences {
  bookingUpdates: boolean;
  messages: boolean;
  payments: boolean;
  offers: boolean;
}

export interface Preferences {
  locale: Locale;
  theme: ThemePreference;
  session: Session | null;
  notifications: NotificationPreferences;
}

const KEY = 'myhome-preferences';
const defaults: Preferences = {
  locale: 'en',
  theme: 'system',
  session: null,
  notifications: { bookingUpdates: true, messages: true, payments: true, offers: false },
};

let cache: Preferences | null = null;

function parse(raw: string | null): Partial<Preferences> {
  try {
    return raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
  } catch {
    return {};
  }
}

export function readPreferences(): Preferences {
  if (cache) return cache;
  const stored = parse(storage.getItem(KEY));
  cache = {
    ...defaults,
    ...stored,
    notifications: { ...defaults.notifications, ...stored.notifications },
  };
  return cache;
}

export function writePreferences(patch: Partial<Preferences>): Preferences {
  cache = { ...readPreferences(), ...patch };
  void storage.setItem(KEY, JSON.stringify(cache));
  return cache;
}
