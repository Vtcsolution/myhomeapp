import { ApiError } from '../../api/errors';
import type { Session } from '../../api/contracts';
import type { BusinessConfig } from '../../brand/business.config';
import { isCustomerCancellable, isUpcomingStatus } from '../../domain/bookingStatus';
import { HOUR_MS, toMs } from '../../domain/time';
import type {
  AppNotification,
  Booking,
  Customer,
  ID,
  LocalizedText,
  NotificationType,
  Technician,
  UserRole,
  Vendor,
} from '../../types';
import type { MockState } from '../state';

export interface MockContext {
  state: MockState;
  now(): number;
  nowISO(): string;
  /** Unique id with a readable prefix, e.g. `bkg-1042`. */
  nextId(prefix: string): string;
  config: BusinessConfig;
  /** Seconds before a simulated chat/support reply; `null` disables them. */
  replyDelaySec: number | null;
}

// ─── Guards ──────────────────────────────────────────────────────────────────

export function requireSession(ctx: MockContext, role?: UserRole): Session {
  const session = ctx.state.session;
  if (!session || toMs(session.expiresAt) <= ctx.now()) {
    throw new ApiError('UNAUTHORIZED', 'Please sign in to continue.');
  }
  if (role && session.role !== role) {
    throw new ApiError('FORBIDDEN', 'This action is not available for your account type.');
  }
  return session;
}

export function currentCustomer(ctx: MockContext): Customer {
  const { userId } = requireSession(ctx, 'customer');
  const customer = ctx.state.customers.find((c) => c.id === userId);
  if (!customer) throw new ApiError('UNAUTHORIZED', 'Account not found.');
  if (customer.status === 'blocked') {
    throw new ApiError(
      'ACCOUNT_BLOCKED',
      'This account has been suspended. Please contact support.',
    );
  }
  return customer;
}

export function currentTechnician(ctx: MockContext): Technician {
  const { userId } = requireSession(ctx, 'technician');
  const technician = ctx.state.technicians.find((t) => t.id === userId);
  if (!technician) throw new ApiError('UNAUTHORIZED', 'Account not found.');
  return technician;
}

export function validation(message: string, details?: unknown): never {
  throw new ApiError('VALIDATION', message, details);
}

export function conflict(message: string, details?: unknown): never {
  throw new ApiError('CONFLICT', message, details);
}

// ─── Finders ─────────────────────────────────────────────────────────────────

function finder<T extends { id: ID }>(label: string, list: (s: MockState) => T[]) {
  return (ctx: MockContext, id: ID): T => {
    const found = list(ctx.state).find((item) => item.id === id);
    if (!found) throw new ApiError('NOT_FOUND', `${label} not found.`);
    return found;
  };
}

export const findBooking = finder('Booking', (s) => s.bookings);
export const findService = finder('Service', (s) => s.services);
export const findCategory = finder('Category', (s) => s.categories);
export const findTechnician = finder('Technician', (s) => s.technicians);
export const findCustomer = finder('Customer', (s) => s.customers);
export const findVendor = finder('Vendor', (s) => s.vendors);
export const findCoupon = finder('Coupon', (s) => s.coupons);
export const findReview = finder('Review', (s) => s.reviews);
export const findTicket = finder('Ticket', (s) => s.tickets);
export const findPayout = finder('Payout', (s) => s.payouts);
export const findThread = finder('Conversation', (s) => s.chatThreads);

export function vendorOf(ctx: MockContext, technician: Technician): Vendor | null {
  return technician.vendorId
    ? (ctx.state.vendors.find((v) => v.id === technician.vendorId) ?? null)
    : null;
}

export function commissionRateFor(ctx: MockContext, technicianId: ID | null): number {
  const technician = technicianId
    ? ctx.state.technicians.find((t) => t.id === technicianId)
    : undefined;
  const vendor = technician ? vendorOf(ctx, technician) : null;
  return vendor?.commissionRate ?? ctx.config.defaultCommissionRate;
}

export function netForTechnician(ctx: MockContext, booking: Booking): number {
  return (
    booking.price.total -
    Math.round(booking.price.total * commissionRateFor(ctx, booking.technicianId))
  );
}

// ─── Mutations shared by several modules ─────────────────────────────────────

export function notify(
  ctx: MockContext,
  recipientRole: UserRole,
  recipientId: ID,
  type: NotificationType,
  title: LocalizedText,
  body: LocalizedText,
  bookingId?: ID,
  links: { threadId?: ID; ticketId?: ID } = {},
): void {
  const notification: AppNotification = {
    id: ctx.nextId('ntf'),
    recipientRole,
    recipientId,
    type,
    title,
    body,
    read: false,
    createdAt: ctx.nowISO(),
    ...(bookingId ? { bookingId } : {}),
    ...links,
  };
  ctx.state.notifications.unshift(notification);
}

export function touch(ctx: MockContext, booking: Booking): void {
  booking.updatedAt = ctx.nowISO();
}

/** Recomputes rating aggregates from published reviews. */
export function recomputeRatings(ctx: MockContext, technicianId: ID, serviceId: ID): void {
  const avg = (ratings: number[]) =>
    ratings.length
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100
      : 0;
  const published = ctx.state.reviews.filter((r) => r.status === 'published');
  const technician = ctx.state.technicians.find((t) => t.id === technicianId);
  if (technician) {
    const own = published.filter((r) => r.technicianId === technicianId).map((r) => r.rating);
    technician.rating = avg(own);
    technician.reviewsCount = own.length;
  }
  const service = ctx.state.services.find((s) => s.id === serviceId);
  if (service) {
    const own = published.filter((r) => r.serviceId === serviceId).map((r) => r.rating);
    service.rating = avg(own);
    service.reviewsCount = own.length;
  }
}

// ─── Policies ────────────────────────────────────────────────────────────────

export function isLateChange(ctx: MockContext, booking: Booking): boolean {
  return toMs(booking.scheduledStart) - ctx.now() < ctx.config.freeCancellationHours * HOUR_MS;
}

export function cancellationFeeFor(ctx: MockContext, booking: Booking): number {
  if (!isCustomerCancellable(booking.status) || !isLateChange(ctx, booking)) return 0;
  return Math.min(ctx.config.lateCancellationFee, booking.payment.paidAmount);
}

export function canReschedule(ctx: MockContext, booking: Booking): boolean {
  return isUpcomingStatus(booking.status) && !isLateChange(ctx, booking);
}

/** "Noura Al-Kandari" → "Noura K." — public display without the full surname. */
export function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  const surname = last.replace(/^(al|el)-/i, '');
  return surname ? `${first} ${surname.charAt(0).toUpperCase()}.` : first;
}

export function simulatedReference(): string {
  return `SIM-${Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0')}`;
}
