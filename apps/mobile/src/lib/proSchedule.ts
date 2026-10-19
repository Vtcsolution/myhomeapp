/**
 * The professional's day: their jobs in order and the state of every arrival
 * window. Built only from the shared scheduling rules (`dayWindows`,
 * `isTechnicianAvailable`, `bookingOccupancy`) — no separate engine.
 */
import {
  type Booking,
  bookingOccupancy,
  dayWindows,
  type DayAvailability,
  intervalsOverlap,
  isTechnicianAvailable,
  kuwaitDateOf,
  type LocalDate,
  type Technician,
  toMs,
  weekdayOfLocalDate,
} from '@myhome/shared';

export type WindowState = 'booked' | 'free' | 'outside' | 'past';

export interface AgendaWindow {
  start: string;
  end: string;
  state: WindowState;
  /** The job occupying the window, when booked. */
  jobId?: string;
}

export interface DayAgenda<J extends Booking> {
  date: LocalDate;
  /** Working hours for the day, or null when not working. */
  hours: DayAvailability | null;
  dayOff: boolean;
  /** Non-cancelled jobs of the day, earliest first. */
  jobs: J[];
  windows: AgendaWindow[];
}

const HOLDS_TIME = new Set(['confirmed', 'on_the_way', 'arrived', 'in_progress']);

export function dayAgenda<J extends Booking>(
  date: LocalDate,
  technician: Pick<Technician, 'availability'>,
  allJobs: readonly J[],
  now: number,
): DayAgenda<J> {
  const dayOff = technician.availability.daysOff.includes(date);
  const hours = dayOff ? null : technician.availability.weekly[weekdayOfLocalDate(date)];
  const jobs = allJobs
    .filter((j) => j.status !== 'cancelled' && kuwaitDateOf(j.scheduledStart) === date)
    .sort((a, b) => toMs(a.scheduledStart) - toMs(b.scheduledStart));
  const holding = jobs.filter((j) => HOLDS_TIME.has(j.status) || j.status === 'completed');

  const windows = dayWindows(date).map(({ start, end }): AgendaWindow => {
    const job = holding.find((j) => {
      const occ = bookingOccupancy(j);
      return intervalsOverlap(start, end, occ.start, occ.end);
    });
    if (job) return { start, end, state: 'booked', jobId: job.id };
    if (toMs(end) <= now) return { start, end, state: 'past' };
    const available = isTechnicianAvailable(technician as Technician, start, end);
    return { start, end, state: available ? 'free' : 'outside' };
  });

  return { date, hours, dayOff, jobs, windows };
}

/** How many non-cancelled jobs fall on each date (for the date strip). */
export function jobsPerDay(jobs: readonly Booking[]): Map<LocalDate, number> {
  const counts = new Map<LocalDate, number>();
  for (const j of jobs) {
    if (j.status === 'cancelled') continue;
    const date = kuwaitDateOf(j.scheduledStart);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}
