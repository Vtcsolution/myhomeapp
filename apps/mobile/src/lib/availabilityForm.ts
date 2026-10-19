/**
 * Editing weekly working hours within the configured Kuwait business hours
 * (e.g. Fridays open later). The API validates again on save.
 */
import {
  businessConfig,
  type DayAvailability,
  minutesToHHmm,
  parseHHmm,
  type TechnicianAvailability,
  type Weekday,
} from '@myhome/shared';

export const STEP_MINUTES = 30;
export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function businessBounds(day: Weekday): { open: number; close: number } {
  const hours = businessConfig.workingHours[day];
  return { open: parseHHmm(hours.open), close: parseHHmm(hours.close) };
}

/** Turning a day on starts with the full bookable hours of that weekday. */
export function toggleDay(
  availability: TechnicianAvailability,
  day: Weekday,
  working: boolean,
): TechnicianAvailability {
  const { open, close } = businessBounds(day);
  return {
    ...availability,
    weekly: {
      ...availability.weekly,
      [day]: working ? { start: minutesToHHmm(open), end: minutesToHHmm(close) } : null,
    },
  };
}

/** Moves the start or end by whole steps, staying within business hours and one step apart. */
export function stepTime(
  availability: TechnicianAvailability,
  day: Weekday,
  edge: 'start' | 'end',
  steps: number,
): TechnicianAvailability {
  const hours = availability.weekly[day];
  if (!hours) return availability;
  const { open, close } = businessBounds(day);
  const start = parseHHmm(hours.start);
  const end = parseHHmm(hours.end);
  const next =
    edge === 'start'
      ? Math.min(Math.max(open, start + steps * STEP_MINUTES), end - STEP_MINUTES)
      : Math.max(Math.min(close, end + steps * STEP_MINUTES), start + STEP_MINUTES);
  const updated: DayAvailability =
    edge === 'start'
      ? { start: minutesToHHmm(next), end: hours.end }
      : { start: hours.start, end: minutesToHHmm(next) };
  return { ...availability, weekly: { ...availability.weekly, [day]: updated } };
}

/** Weekdays whose hours are invalid (end not after start). */
export function invalidDays(availability: TechnicianAvailability): Weekday[] {
  return WEEKDAYS.filter((day) => {
    const hours = availability.weekly[day];
    return !!hours && parseHHmm(hours.start) >= parseHHmm(hours.end);
  });
}

export function addDayOff(
  availability: TechnicianAvailability,
  date: string,
): TechnicianAvailability {
  if (availability.daysOff.includes(date)) return availability;
  return { ...availability, daysOff: [...availability.daysOff, date].sort() };
}

export function removeDayOff(
  availability: TechnicianAvailability,
  date: string,
): TechnicianAvailability {
  return { ...availability, daysOff: availability.daysOff.filter((d) => d !== date) };
}
