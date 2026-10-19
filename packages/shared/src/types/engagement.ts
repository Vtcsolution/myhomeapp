import type { Fils, ID, ISODateTime, Locale, LocalizedText } from './common';
import type { UserRole } from './user';

export type ReviewStatus = 'published' | 'hidden' | 'flagged';

export interface Review {
  id: ID;
  bookingId: ID;
  customerId: ID;
  technicianId: ID;
  serviceId: ID;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  language: Locale;
  status: ReviewStatus;
  createdAt: ISODateTime;
}

export type NotificationType =
  'booking_update' | 'job_offer' | 'payment' | 'promotion' | 'chat' | 'system';

export interface AppNotification {
  id: ID;
  recipientRole: UserRole;
  recipientId: ID;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  bookingId?: ID;
  read: boolean;
  createdAt: ISODateTime;
}

export interface ChatThread {
  id: ID;
  bookingId: ID;
  customerId: ID;
  technicianId: ID;
  lastMessageAt: ISODateTime;
  lastMessagePreview: string;
  unreadForCustomer: number;
  unreadForTechnician: number;
}

export interface ChatMessage {
  id: ID;
  threadId: ID;
  sender: 'customer' | 'technician' | 'system';
  text: string;
  createdAt: ISODateTime;
}

export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: ID;
  code: string;
  description: LocalizedText;
  type: CouponType;
  /** Percent (0–100) for `percent`, fils for `fixed`. */
  value: number;
  maxDiscount?: Fils;
  minSubtotal: Fils;
  /** Empty means valid for every category. */
  categoryIds: ID[];
  firstBookingOnly: boolean;
  validFrom: ISODateTime;
  validUntil: ISODateTime;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export type WalletTransactionType = 'top_up' | 'payment' | 'refund' | 'cashback';

export interface WalletTransaction {
  id: ID;
  customerId: ID;
  type: WalletTransactionType;
  /** Positive for credits, negative for debits. */
  amount: Fils;
  description: LocalizedText;
  bookingId?: ID;
  createdAt: ISODateTime;
}

export type PayoutStatus = 'scheduled' | 'processing' | 'paid';

export interface Payout {
  id: ID;
  payeeType: 'technician' | 'vendor';
  payeeId: ID;
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
  jobsCount: number;
  grossAmount: Fils;
  commission: Fils;
  netAmount: Fils;
  status: PayoutStatus;
  paidAt?: ISODateTime;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'booking' | 'payment' | 'technician' | 'app' | 'other';

export interface TicketMessage {
  id: ID;
  from: 'requester' | 'agent';
  text: string;
  createdAt: ISODateTime;
}

export interface SupportTicket {
  id: ID;
  reference: string;
  requesterRole: Exclude<UserRole, 'admin'>;
  requesterId: ID;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  bookingId?: ID;
  messages: TicketMessage[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
