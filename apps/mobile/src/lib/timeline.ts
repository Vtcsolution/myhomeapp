/**
 * The customer-facing status timeline for a booking, built from the shared
 * lifecycle (`BOOKING_FLOW`) and the booking's own timeline events.
 */
import { BOOKING_FLOW, type Booking, type BookingStatus, type TimelineEvent } from '@myhome/shared';

export type StepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  status: BookingStatus;
  state: StepState;
  /** When the step happened (latest matching event), if it has. */
  at?: string;
}

const EVENT_FOR_STATUS: Partial<Record<BookingStatus, TimelineEvent['type']>> = {
  pending: 'created',
  confirmed: 'confirmed',
  on_the_way: 'on_the_way',
  arrived: 'arrived',
  in_progress: 'in_progress',
  completed: 'completed',
};

function latestAt(
  events: readonly TimelineEvent[],
  type: TimelineEvent['type'],
): string | undefined {
  return events.filter((e) => e.type === type).pop()?.at;
}

/**
 * Happy-path steps with their state. A cancelled booking shows the steps it
 * reached followed by a final "cancelled" step.
 */
export function buildTimeline(booking: Pick<Booking, 'status' | 'timeline'>): TimelineStep[] {
  if (booking.status === 'cancelled') {
    const reached = BOOKING_FLOW.filter((s) => {
      const type = EVENT_FOR_STATUS[s];
      return type ? !!latestAt(booking.timeline, type) : false;
    });
    return [
      ...reached.map((status) => ({
        status,
        state: 'done' as const,
        at: latestAt(booking.timeline, EVENT_FOR_STATUS[status]!),
      })),
      { status: 'cancelled', state: 'current', at: latestAt(booking.timeline, 'cancelled') },
    ];
  }
  const currentIndex = BOOKING_FLOW.indexOf(booking.status);
  return BOOKING_FLOW.map((status, index) => {
    const at = latestAt(booking.timeline, EVENT_FOR_STATUS[status]!);
    const state: StepState =
      index < currentIndex || (status === 'completed' && booking.status === 'completed')
        ? 'done'
        : index === currentIndex
          ? 'current'
          : 'upcoming';
    return { status, state, ...(at && state !== 'upcoming' ? { at } : {}) };
  });
}

/**
 * Journey progress for the simulated tracking view: time travelled over
 * travelled + remaining, capped below 100% until the professional arrives.
 */
export function travelProgress(elapsedMinutes: number, etaMinutes: number | null): number {
  if (etaMinutes === null) return 0;
  const elapsed = Math.max(0, elapsedMinutes);
  const remaining = Math.max(0, etaMinutes);
  if (elapsed + remaining === 0) return 0;
  return Math.min(0.97, elapsed / (elapsed + remaining));
}
