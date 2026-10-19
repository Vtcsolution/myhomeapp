import type { BookingStatus } from '../types/booking';
import type { UserRole } from '../types/user';

/** The happy path, in order. */
export const BOOKING_FLOW: readonly BookingStatus[] = [
  'pending',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
];

const ALLOWED: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['on_the_way', 'cancelled'],
  on_the_way: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Customers may cancel only before the technician sets off. */
const CUSTOMER_CANCELLABLE: readonly BookingStatus[] = ['pending', 'confirmed'];

export function canTransition(from: BookingStatus, to: BookingStatus, role: UserRole): boolean {
  if (!ALLOWED[from].includes(to)) return false;
  switch (role) {
    case 'admin':
      return true;
    case 'customer':
      return to === 'cancelled' && CUSTOMER_CANCELLABLE.includes(from);
    case 'technician':
      return to !== 'cancelled';
  }
}

export type TechnicianStep = Exclude<BookingStatus, 'pending' | 'confirmed' | 'cancelled'>;

/** The status a technician moves the job to next, or `null` when there is none. */
export function nextTechnicianStatus(status: BookingStatus): TechnicianStep | null {
  if (status === 'pending' || status === 'completed' || status === 'cancelled') return null;
  const index = BOOKING_FLOW.indexOf(status);
  return (BOOKING_FLOW[index + 1] as TechnicianStep | undefined) ?? null;
}

export function isCustomerCancellable(status: BookingStatus): boolean {
  return CUSTOMER_CANCELLABLE.includes(status);
}

/** Booked but the visit has not started. */
export function isUpcomingStatus(status: BookingStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

/** The technician is travelling or working. */
export function isLiveStatus(status: BookingStatus): boolean {
  return status === 'on_the_way' || status === 'arrived' || status === 'in_progress';
}

export function isFinalStatus(status: BookingStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/** Progress through the happy path, 0–1 (cancelled → 0). */
export function bookingProgress(status: BookingStatus): number {
  if (status === 'cancelled') return 0;
  return BOOKING_FLOW.indexOf(status) / (BOOKING_FLOW.length - 1);
}
