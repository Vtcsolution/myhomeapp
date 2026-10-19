/**
 * Kuwait-time helpers. Kuwait is UTC+3 with no daylight saving, so all local
 * calculations are done by shifting UTC milliseconds — this behaves identically
 * on Node, Hermes and browsers regardless of the device time zone.
 */
import { businessConfig } from '../brand/business.config';
import type { ISODateTime, LocalDate } from '../types/common';
import type { Weekday } from '../types/user';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const OFFSET_MS = businessConfig.utcOffsetMinutes * MINUTE_MS;

export type DateInput = ISODateTime | Date | number;

export interface KuwaitDateParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: Weekday;
}

export function toMs(input: DateInput): number {
  if (typeof input === 'number') return input;
  if (input instanceof Date) return input.getTime();
  const ms = Date.parse(input);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid date: ${input}`);
  return ms;
}

export function toISO(input: DateInput): ISODateTime {
  return new Date(toMs(input)).toISOString();
}

export function toKuwaitParts(input: DateInput): KuwaitDateParts {
  const d = new Date(toMs(input) + OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay() as Weekday,
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Kuwait calendar date of an instant, `YYYY-MM-DD`. */
export function kuwaitDateOf(input: DateInput): LocalDate {
  const p = toKuwaitParts(input);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** "HH:mm" → minutes after midnight. */
export function parseHHmm(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Invalid time: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) throw new RangeError(`Invalid time: ${value}`);
  return hours * 60 + minutes;
}

export function minutesToHHmm(totalMinutes: number): string {
  return `${pad2(Math.floor(totalMinutes / 60))}:${pad2(totalMinutes % 60)}`;
}

function parseLocalDate(date: LocalDate): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Invalid local date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Kuwait local date + "HH:mm" → UTC ISO instant. */
export function kuwaitLocalToISO(date: LocalDate, time = '00:00'): ISODateTime {
  const { y, m, d } = parseLocalDate(date);
  const ms = Date.UTC(y, m - 1, d) + parseHHmm(time) * MINUTE_MS - OFFSET_MS;
  return new Date(ms).toISOString();
}

export function addDaysToLocalDate(date: LocalDate, days: number): LocalDate {
  const { y, m, d } = parseLocalDate(date);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

export function weekdayOfLocalDate(date: LocalDate): Weekday {
  const { y, m, d } = parseLocalDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

/** Midnight (Kuwait time) of the day containing `input`, as a UTC instant. */
export function startOfKuwaitDay(input: DateInput): ISODateTime {
  return kuwaitLocalToISO(kuwaitDateOf(input));
}

export function addMinutes(input: DateInput, minutes: number): ISODateTime {
  return new Date(toMs(input) + minutes * MINUTE_MS).toISOString();
}

/** Whole days between two Kuwait calendar dates (b − a). */
export function daysBetweenLocalDates(a: LocalDate, b: LocalDate): number {
  const pa = parseLocalDate(a);
  const pb = parseLocalDate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / DAY_MS);
}

export function intervalsOverlap(
  aStart: DateInput,
  aEnd: DateInput,
  bStart: DateInput,
  bEnd: DateInput,
): boolean {
  return toMs(aStart) < toMs(bEnd) && toMs(bStart) < toMs(aEnd);
}
