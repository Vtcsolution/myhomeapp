import { type BusinessConfig, businessConfig } from '../brand/business.config';
import type { Booking, TimeSlot } from '../types/booking';
import type { ISODateTime, LocalDate } from '../types/common';
import type { Technician } from '../types/user';
import {
  addDaysToLocalDate,
  addMinutes,
  intervalsOverlap,
  kuwaitDateOf,
  kuwaitLocalToISO,
  minutesToHHmm,
  MINUTE_MS,
  parseHHmm,
  toKuwaitParts,
  toMs,
  weekdayOfLocalDate,
} from './time';

/** Arrival windows for a Kuwait calendar day, based on working hours. */
export function dayWindows(
  date: LocalDate,
  config: BusinessConfig = businessConfig,
): { start: ISODateTime; end: ISODateTime }[] {
  const hours = config.workingHours[weekdayOfLocalDate(date)];
  const open = parseHHmm(hours.open);
  const close = parseHHmm(hours.close);
  const windows: { start: ISODateTime; end: ISODateTime }[] = [];
  for (let t = open; t + config.slotLengthMinutes <= close; t += config.slotLengthMinutes) {
    windows.push({
      start: kuwaitLocalToISO(date, minutesToHHmm(t)),
      end: kuwaitLocalToISO(date, minutesToHHmm(t + config.slotLengthMinutes)),
    });
  }
  return windows;
}

/** The dates a customer can pick, starting today (Kuwait time). */
export function bookableDates(
  now: ISODateTime,
  config: BusinessConfig = businessConfig,
): LocalDate[] {
  const today = kuwaitDateOf(now);
  return Array.from({ length: config.bookingHorizonDays }, (_, i) => addDaysToLocalDate(today, i));
}

/** Does the technician's weekly availability cover the whole interval? */
export function isTechnicianAvailable(
  technician: Technician,
  start: ISODateTime,
  end: ISODateTime,
): boolean {
  const date = kuwaitDateOf(start);
  if (technician.availability.daysOff.includes(date)) return false;
  const day = technician.availability.weekly[weekdayOfLocalDate(date)];
  if (!day) return false;
  const s = toKuwaitParts(start);
  const startMin = s.hour * 60 + s.minute;
  const endMin = startMin + (toMs(end) - toMs(start)) / MINUTE_MS;
  return startMin >= parseHHmm(day.start) && endMin <= parseHHmm(day.end);
}

/** The interval a booking occupies a technician: the arrival window or the job length, whichever is longer. */
export function bookingOccupancy(booking: Booking): { start: ISODateTime; end: ISODateTime } {
  const jobEnd = addMinutes(booking.scheduledStart, booking.price.estimatedDurationMin);
  return {
    start: booking.scheduledStart,
    end: toMs(jobEnd) > toMs(booking.scheduledEnd) ? jobEnd : booking.scheduledEnd,
  };
}

const BLOCKING_STATUSES = new Set(['confirmed', 'on_the_way', 'arrived', 'in_progress']);

/** Is the technician free (no overlapping assigned job) for the interval? */
export function isTechnicianFree(
  technicianId: string,
  start: ISODateTime,
  end: ISODateTime,
  bookings: Booking[],
  ignoreBookingId?: string,
): boolean {
  return !bookings.some((b) => {
    if (b.technicianId !== technicianId || b.id === ignoreBookingId) return false;
    if (!BLOCKING_STATUSES.has(b.status)) return false;
    const occ = bookingOccupancy(b);
    return intervalsOverlap(start, end, occ.start, occ.end);
  });
}

export interface SlotQuery {
  date: LocalDate;
  now: ISODateTime;
  durationMin: number;
  /** Technicians already filtered by category, governorate and active status. */
  technicians: Technician[];
  bookings: Booking[];
  ignoreBookingId?: string;
}

export function computeSlots(
  query: SlotQuery,
  config: BusinessConfig = businessConfig,
): TimeSlot[] {
  const earliest = toMs(query.now) + config.minLeadTimeMinutes * MINUTE_MS;
  const today = kuwaitDateOf(query.now);
  const lastDate = addDaysToLocalDate(today, config.bookingHorizonDays - 1);
  if (query.date < today || query.date > lastDate) return [];

  return dayWindows(query.date, config).map(({ start, end }) => {
    const jobEnd = addMinutes(start, Math.max(query.durationMin, config.slotLengthMinutes));
    const capacity = query.technicians.filter(
      (t) =>
        isTechnicianAvailable(t, start, end) &&
        isTechnicianFree(t.id, start, jobEnd, query.bookings, query.ignoreBookingId),
    ).length;
    return { start, end, capacity, available: capacity > 0 && toMs(start) >= earliest };
  });
}
