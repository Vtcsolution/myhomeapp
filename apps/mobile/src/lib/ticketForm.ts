import type { TicketCategory } from '@myhome/shared';

/** Client-side checks matching the support API's rules. */
export interface TicketDraft {
  category: TicketCategory;
  subject: string;
  message: string;
}

export type TicketErrors = Partial<Record<'subject' | 'message', 'invalid'>>;

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 120;
export const MESSAGE_MAX = 2000;

export function validateTicket(draft: TicketDraft): TicketErrors {
  const errors: TicketErrors = {};
  const subject = draft.subject.trim();
  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) errors.subject = 'invalid';
  const message = draft.message.trim();
  if (!message || message.length > MESSAGE_MAX) errors.message = 'invalid';
  return errors;
}

const CATEGORIES: readonly TicketCategory[] = ['booking', 'payment', 'technician', 'app', 'other'];

/** Route parameter → category (unknown values fall back to a booking question). */
export function parseCategory(value: string | undefined, hasBooking: boolean): TicketCategory {
  if (value && (CATEGORIES as readonly string[]).includes(value)) return value as TicketCategory;
  return hasBooking ? 'booking' : 'other';
}
