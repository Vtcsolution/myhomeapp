/**
 * Business rules shared by the mock API, the mobile app and the admin dashboard.
 * When a real backend exists these values will be served by it; keeping them in
 * one place means the frontends never hard-code policy.
 */
import type { Fils } from '../types/common';

export interface WorkingHours {
  /** 24h "HH:mm" in Kuwait time. */
  open: string;
  close: string;
}

export interface BusinessConfig {
  currency: 'KWD';
  /** Kuwait is UTC+3 all year (no daylight saving). */
  utcOffsetMinutes: number;
  /** Flat visit fee added to every booking below the waiver threshold. */
  visitFee: Fils;
  freeVisitThreshold: Fils;
  /** Kuwait currently levies no VAT on these services; kept configurable. */
  taxRate: number;
  /** Customers may cancel or reschedule free of charge until this many hours before the slot. */
  freeCancellationHours: number;
  lateCancellationFee: Fils;
  /** Earliest bookable slot is at least this far in the future. */
  minLeadTimeMinutes: number;
  /** Customers choose an arrival window of this length. */
  slotLengthMinutes: number;
  /** How many days ahead customers can book. */
  bookingHorizonDays: number;
  /** Working hours by weekday (0 = Sunday … 6 = Saturday). Friday opens after midday prayers. */
  workingHours: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, WorkingHours>;
  /** Default platform commission for independent technicians (vendors may differ). */
  defaultCommissionRate: number;
  /** Simulated OTP code accepted by the demo — there is no real SMS gateway. */
  demoOtpCode: string;
}

const standardDay: WorkingHours = { open: '08:00', close: '22:00' };

export const businessConfig: BusinessConfig = {
  currency: 'KWD',
  utcOffsetMinutes: 180,
  visitFee: 1_000,
  freeVisitThreshold: 10_000,
  taxRate: 0,
  freeCancellationHours: 3,
  lateCancellationFee: 2_000,
  minLeadTimeMinutes: 120,
  slotLengthMinutes: 120,
  bookingHorizonDays: 14,
  workingHours: {
    0: standardDay,
    1: standardDay,
    2: standardDay,
    3: standardDay,
    4: standardDay,
    5: { open: '14:00', close: '22:00' },
    6: standardDay,
  },
  defaultCommissionRate: 0.15,
  demoOtpCode: '1234',
};
