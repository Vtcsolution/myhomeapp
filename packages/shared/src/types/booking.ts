import type { Fils, ID, ISODateTime, LocalizedText } from './common';
import type { Address } from './geo';
import type { UserRole } from './user';

/**
 * Lifecycle:
 * pending → confirmed → on_the_way → arrived → in_progress → completed
 * `pending` and `confirmed` (and, for admins, later states) may move to `cancelled`.
 */
export type BookingStatus =
  'pending' | 'confirmed' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

export interface BookingSelections {
  /** Option group id → chosen choice id. */
  options: Record<ID, ID>;
  addOnIds: ID[];
  /** AC units, hours, rooms… Always 1 for fixed/inspection services. */
  units: number;
}

export type LineItemKind = 'service' | 'option' | 'addon' | 'extra';

export interface PriceLineItem {
  kind: LineItemKind;
  refId?: ID;
  label: LocalizedText;
  quantity: number;
  unitPrice: Fils;
  total: Fils;
}

export interface PriceBreakdown {
  items: PriceLineItem[];
  /** Service + options + add-ons (+ approved extras). */
  subtotal: Fils;
  visitFee: Fils;
  discount: Fils;
  tax: Fils;
  total: Fils;
  couponCode?: string;
  estimatedDurationMin: number;
}

export type PaymentMethod = 'knet' | 'card' | 'apple_pay' | 'cash' | 'wallet';
export type PaymentStatus = 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';

/** Payments are simulated in this demo — no gateway is contacted. */
export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  paidAmount: Fils;
  refundedAmount: Fils;
  /** Simulated transaction reference, prefixed `SIM-`. */
  reference?: string;
  paidAt?: ISODateTime;
}

export type ExtraChargeStatus = 'pending_approval' | 'approved' | 'declined';

/** Additional work quoted on site by the technician; the customer must approve it. */
export interface ExtraCharge {
  id: ID;
  description: string;
  amount: Fils;
  status: ExtraChargeStatus;
  createdAt: ISODateTime;
  respondedAt?: ISODateTime;
}

export type TimelineEventType =
  | 'created'
  | 'confirmed'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'technician_assigned'
  | 'extra_charge_added'
  | 'extra_charge_approved'
  | 'extra_charge_declined'
  | 'reviewed';

export interface TimelineEvent {
  type: TimelineEventType;
  at: ISODateTime;
  actor: UserRole | 'system';
  note?: string;
}

export interface Cancellation {
  by: UserRole | 'system';
  reason: string;
  at: ISODateTime;
  fee: Fils;
  refundAmount: Fils;
}

export interface Booking {
  id: ID;
  /** Human-friendly reference shown to customers, e.g. `MH-48213`. */
  reference: string;
  customerId: ID;
  serviceId: ID;
  categoryId: ID;
  selections: BookingSelections;
  /** Snapshot of the address at booking time. */
  address: Address;
  scheduledStart: ISODateTime;
  scheduledEnd: ISODateTime;
  status: BookingStatus;
  technicianId: ID | null;
  vendorId: ID | null;
  /** Technicians who have been offered this job while it is pending. */
  offeredTo: ID[];
  /** Technicians who declined the offer. */
  declinedBy: ID[];
  price: PriceBreakdown;
  payment: PaymentInfo;
  extraCharges: ExtraCharge[];
  customerNotes?: string;
  timeline: TimelineEvent[];
  cancellation?: Cancellation;
  reviewId?: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** An arrival window offered to the customer. */
export interface TimeSlot {
  start: ISODateTime;
  end: ISODateTime;
  available: boolean;
  /** How many technicians are free for this window. */
  capacity: number;
}
