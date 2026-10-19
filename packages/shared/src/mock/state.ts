import type { Session } from '../api/contracts';
import type {
  AdminUser,
  AppNotification,
  Booking,
  ChatMessage,
  ChatThread,
  Coupon,
  Customer,
  ID,
  ISODateTime,
  Payout,
  Promotion,
  Review,
  Service,
  ServiceCategory,
  SupportTicket,
  Technician,
  Vendor,
  WalletTransaction,
} from '../types';

export interface OtpRecord {
  id: ID;
  phone: string;
  role: 'customer' | 'technician';
  code: string;
  expiresAt: ISODateTime;
  attempts: number;
  used: boolean;
}

/** The complete in-memory database behind the simulated API. JSON-serialisable. */
export interface MockState {
  version: 1;
  seededAt: ISODateTime;
  customers: Customer[];
  vendors: Vendor[];
  technicians: Technician[];
  admins: (AdminUser & { password: string })[];
  categories: ServiceCategory[];
  services: Service[];
  promotions: Promotion[];
  coupons: Coupon[];
  bookings: Booking[];
  reviews: Review[];
  notifications: AppNotification[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  walletTransactions: WalletTransaction[];
  payouts: Payout[];
  tickets: SupportTicket[];
  otpRequests: OtpRecord[];
  session: Session | null;
  /** Bookings created through the API that the simulation will confirm automatically. */
  autoConfirmQueue: ID[];
  /** Demo replies the simulation will post (chat: the professional; ticket: customer care). */
  simulatedReplies?: { kind: 'chat' | 'ticket'; targetId: ID; dueAt: ISODateTime }[];
  /** Idempotency key → booking id for `bookings.create` (absent in older saved states). */
  idempotencyKeys?: Record<string, ID>;
  /** Monotonic counter for generated ids and booking references. */
  sequence: number;
}

export function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
