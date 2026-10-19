import { type TimeSlot, toKuwaitParts } from '@myhome/shared';

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

export interface SlotGroup {
  period: DayPeriod;
  slots: TimeSlot[];
}

/** Morning before 12:00, afternoon 12:00–16:59, evening from 17:00 (Kuwait time). */
export function periodOf(slot: TimeSlot): DayPeriod {
  const hour = toKuwaitParts(slot.start).hour;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

/** Groups a day's arrival windows by period, keeping chronological order and dropping empty groups. */
export function groupSlots(slots: readonly TimeSlot[]): SlotGroup[] {
  const order: DayPeriod[] = ['morning', 'afternoon', 'evening'];
  const sorted = [...slots].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return order
    .map((period) => ({ period, slots: sorted.filter((s) => periodOf(s) === period) }))
    .filter((g) => g.slots.length > 0);
}

export function hasAvailability(slots: readonly TimeSlot[] | undefined): boolean {
  return !!slots?.some((s) => s.available);
}

/** First date (in the given order) whose slots include an available window. */
export function firstAvailableDate(
  dates: readonly string[],
  slotsByDate: ReadonlyMap<string, readonly TimeSlot[] | undefined>,
): string | undefined {
  return dates.find((d) => hasAvailability(slotsByDate.get(d)));
}

/** Is a previously chosen slot still bookable? */
export function isSlotStillAvailable(
  slot: string | undefined,
  slots: readonly TimeSlot[] | undefined,
): boolean {
  if (!slot || !slots) return false;
  const ms = Date.parse(slot);
  return slots.some((s) => s.available && Date.parse(s.start) === ms);
}

export type SlotState = 'current' | 'selected' | 'available' | 'unavailable';

/**
 * How a window is shown. The booking's own window (when rescheduling) is
 * "current" and can never be chosen as the new time, even though the API
 * reports it free for that booking.
 */
export function slotState(
  slot: TimeSlot,
  selected: string | undefined,
  current: string | undefined,
): SlotState {
  const ms = Date.parse(slot.start);
  if (current && Date.parse(current) === ms) return 'current';
  if (!slot.available) return 'unavailable';
  return selected && Date.parse(selected) === ms ? 'selected' : 'available';
}
