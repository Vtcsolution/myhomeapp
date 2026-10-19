/**
 * The API surface used by every frontend. The demo ships a simulated
 * implementation (`@myhome/shared/mock`); the future backend client will
 * implement this same interface so screens do not change.
 */
import type { CouponRejection } from '../domain/pricing';
import type {
  Booking,
  BookingSelections,
  BookingStatus,
  PaymentMethod,
  PriceBreakdown,
  TimeSlot,
} from '../types/booking';
import type { Promotion, Service, ServiceCategory } from '../types/catalog';
import type {
  Fils,
  GeoPoint,
  ID,
  ISODateTime,
  Locale,
  LocalDate,
  LocalizedText,
  Paginated,
} from '../types/common';
import type {
  AppNotification,
  ChatMessage,
  ChatThread,
  Coupon,
  Payout,
  PayoutStatus,
  Review,
  ReviewStatus,
  SupportTicket,
  TicketCategory,
  TicketStatus,
  WalletTransaction,
} from '../types/engagement';
import type { Address, Area, Governorate, GovernorateId } from '../types/geo';
import type {
  AdminUser,
  Customer,
  DocumentStatus,
  SpokenLanguage,
  Technician,
  TechnicianAvailability,
  TechnicianStatus,
  UserRole,
  Vendor,
  VendorStatus,
} from '../types/user';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Session {
  token: string;
  role: UserRole;
  userId: ID;
  expiresAt: ISODateTime;
  /** True when a customer signs in with a phone number for the first time. */
  isNewUser: boolean;
}

export interface OtpChallenge {
  requestId: ID;
  phone: string;
  expiresInSec: number;
  resendInSec: number;
  /** Demo only: the simulated code, displayed as a hint. A real backend never returns it. */
  demoCode?: string;
}

export interface AuthApi {
  requestOtp(phone: string, role: 'customer' | 'technician'): Promise<OtpChallenge>;
  verifyOtp(requestId: ID, code: string): Promise<Session>;
  adminSignIn(email: string, password: string): Promise<Session>;
  getSession(): Promise<Session | null>;
  restoreSession(session: Session): Promise<void>;
  signOut(): Promise<void>;
}

// ─── Shared views ────────────────────────────────────────────────────────────

export interface TechnicianSummary {
  id: ID;
  fullName: LocalizedText;
  headline: LocalizedText;
  rating: number;
  reviewsCount: number;
  jobsCompleted: number;
  yearsExperience: number;
  languages: SpokenLanguage[];
  vendorName?: LocalizedText;
}

export interface CustomerSummaryView {
  id: ID;
  fullName: string;
  phone: string;
}

/** A booking enriched with everything a screen needs to render it. */
export interface BookingView extends Booking {
  service: Pick<Service, 'id' | 'name' | 'image' | 'pricingModel' | 'unitLabel' | 'warrantyDays'>;
  category: Pick<ServiceCategory, 'id' | 'name' | 'icon'>;
  customer: CustomerSummaryView;
  technician: TechnicianSummary | null;
  review: Review | null;
  chatThreadId: ID | null;
  /** Amount still to be paid (approved extras, or the whole total for cash). */
  balanceDue: Fils;
  canCancel: boolean;
  canReschedule: boolean;
  /** Fee that would apply if the customer cancelled now. */
  cancellationFee: Fils;
}

export interface ReviewView extends Review {
  /** "Noura A." — customers are never fully named publicly. */
  customerDisplayName: string;
  serviceName: LocalizedText;
  technicianName: LocalizedText;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface CatalogApi {
  listCategories(): Promise<ServiceCategory[]>;
  getCategory(id: ID): Promise<ServiceCategory>;
  listServices(filter?: { categoryId?: ID; popular?: boolean }): Promise<Service[]>;
  getService(id: ID): Promise<Service>;
  search(query: string): Promise<{ services: Service[]; categories: ServiceCategory[] }>;
  listPromotions(): Promise<Promotion[]>;
  listGovernorates(): Promise<Governorate[]>;
  listAreas(governorateId?: GovernorateId): Promise<Area[]>;
  listServiceReviews(serviceId: ID, limit?: number): Promise<ReviewView[]>;
  getTechnician(id: ID): Promise<TechnicianSummary>;
}

// ─── Customer bookings ───────────────────────────────────────────────────────

export interface QuoteRequest {
  serviceId: ID;
  selections: BookingSelections;
  couponCode?: string;
}

export type CouponResult =
  | { code: string; status: 'applied'; discount: Fils }
  | { code: string; status: 'rejected'; reason: CouponRejection | 'not_found' };

export interface QuoteResponse {
  price: PriceBreakdown;
  coupon?: CouponResult;
}

export interface SlotRequest {
  serviceId: ID;
  selections: BookingSelections;
  addressId: ID;
  date: LocalDate;
}

export interface CreateBookingRequest {
  serviceId: ID;
  selections: BookingSelections;
  addressId: ID;
  slotStart: ISODateTime;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  /**
   * Client-generated key for this checkout attempt. Repeating a request with
   * the same key returns the original booking instead of creating a duplicate
   * (maps to an `Idempotency-Key` header on the real backend).
   */
  idempotencyKey?: string;
}

export type BookingScope = 'upcoming' | 'active' | 'past' | 'all';

export interface TrackingInfo {
  bookingId: ID;
  status: BookingStatus;
  technicianLocation: GeoPoint | null;
  destination: GeoPoint;
  /** Minutes until arrival; `null` when not travelling. */
  etaMinutes: number | null;
  distanceKm: number | null;
  updatedAt: ISODateTime;
}

export interface CustomerBookingsApi {
  getQuote(request: QuoteRequest): Promise<QuoteResponse>;
  getBookableDates(): Promise<LocalDate[]>;
  getAvailableSlots(request: SlotRequest): Promise<TimeSlot[]>;
  create(request: CreateBookingRequest): Promise<BookingView>;
  list(scope?: BookingScope): Promise<BookingView[]>;
  get(id: ID): Promise<BookingView>;
  cancel(id: ID, reason: string): Promise<BookingView>;
  getRescheduleSlots(id: ID, date: LocalDate): Promise<TimeSlot[]>;
  reschedule(id: ID, slotStart: ISODateTime): Promise<BookingView>;
  respondToExtraCharge(bookingId: ID, chargeId: ID, approve: boolean): Promise<BookingView>;
  submitReview(
    bookingId: ID,
    input: { rating: Review['rating']; comment: string },
  ): Promise<Review>;
  getTracking(id: ID): Promise<TrackingInfo>;
}

// ─── Customer account ────────────────────────────────────────────────────────

export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { id?: ID; isDefault?: boolean };

/** A wallet movement with what a statement needs. All wallet activity is simulated. */
export interface WalletTransactionView extends WalletTransaction {
  /** Statement reference, e.g. `WT-000123`. */
  reference: string;
  /** Booking reference when the movement belongs to a booking. */
  bookingReference?: string;
  /** Simulated movements settle instantly. */
  status: 'completed';
}

export interface WalletView {
  balance: Fils;
  transactions: WalletTransactionView[];
}

export interface CustomerAccountApi {
  getProfile(): Promise<Customer>;
  updateProfile(patch: {
    fullName?: string;
    email?: string;
    preferredLocale?: Locale;
  }): Promise<Customer>;
  saveAddress(input: AddressInput): Promise<Address>;
  deleteAddress(id: ID): Promise<void>;
  setDefaultAddress(id: ID): Promise<Address[]>;
  getWallet(): Promise<WalletView>;
  /** Simulated top-up; no payment gateway is contacted. */
  topUpWallet(amount: Fils, method: Exclude<PaymentMethod, 'cash' | 'wallet'>): Promise<WalletView>;
  listOffers(): Promise<Coupon[]>;
}

// ─── Notifications, chat, support (role taken from the session) ──────────────

export interface NotificationsApi {
  list(): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(id: ID): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ChatThreadView extends ChatThread {
  bookingReference: string;
  serviceName: LocalizedText;
  counterpartName: LocalizedText;
  /** Unread for the current user. */
  unread: number;
}

export interface ChatApi {
  listThreads(): Promise<ChatThreadView[]>;
  getThread(id: ID): Promise<ChatThreadView>;
  getMessages(threadId: ID): Promise<ChatMessage[]>;
  sendMessage(threadId: ID, text: string): Promise<ChatMessage>;
  markRead(threadId: ID): Promise<void>;
}

export interface CreateTicketRequest {
  subject: string;
  category: TicketCategory;
  message: string;
  bookingId?: ID;
}

export interface SupportApi {
  listTickets(): Promise<SupportTicket[]>;
  getTicket(id: ID): Promise<SupportTicket>;
  createTicket(request: CreateTicketRequest): Promise<SupportTicket>;
  reply(id: ID, text: string): Promise<SupportTicket>;
}

// ─── Technician ──────────────────────────────────────────────────────────────

export interface TechnicianProfileView extends Technician {
  vendor: Pick<Vendor, 'id' | 'name'> | null;
}

export interface TechnicianDashboard {
  isOnline: boolean;
  todayJobs: BookingView[];
  nextJob: BookingView | null;
  pendingOffers: number;
  earningsToday: Fils;
  earningsWeek: Fils;
  jobsCompletedWeek: number;
  rating: number;
  acceptanceRate: number;
}

export type EarningsRange = 'week' | 'month' | 'quarter';

export interface EarningsView {
  range: EarningsRange;
  gross: Fils;
  commission: Fils;
  net: Fils;
  jobs: number;
  /** Net earnings per Kuwait calendar day. */
  series: { date: LocalDate; net: Fils; jobs: number }[];
  /** `vendor`: the technician is paid by their company, not by the platform. */
  paidBy: 'platform' | 'vendor';
  payouts: Payout[];
}

export type JobScope = 'today' | 'upcoming' | 'completed' | 'all';

export interface TechnicianApi {
  getProfile(): Promise<TechnicianProfileView>;
  setOnline(online: boolean): Promise<TechnicianProfileView>;
  getDashboard(): Promise<TechnicianDashboard>;
  listOffers(): Promise<BookingView[]>;
  acceptOffer(bookingId: ID): Promise<BookingView>;
  declineOffer(bookingId: ID, reason?: string): Promise<void>;
  listJobs(scope?: JobScope): Promise<BookingView[]>;
  getJob(id: ID): Promise<BookingView>;
  /** Moves the job to the next status (confirmed → on_the_way → … → completed). */
  advanceJob(id: ID): Promise<BookingView>;
  addExtraCharge(id: ID, input: { description: string; amount: Fils }): Promise<BookingView>;
  getEarnings(range?: EarningsRange): Promise<EarningsView>;
  getAvailability(): Promise<TechnicianAvailability>;
  updateAvailability(availability: TechnicianAvailability): Promise<TechnicianAvailability>;
  listReviews(): Promise<ReviewView[]>;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminDashboard {
  kpis: {
    revenueToday: Fils;
    revenueMonth: Fils;
    revenuePreviousMonth: Fils;
    bookingsToday: number;
    bookingsMonth: number;
    activeTechnicians: number;
    onlineTechnicians: number;
    pendingApprovals: number;
    averageRating: number;
    completionRate: number;
    cancellationRate: number;
  };
  revenueSeries: { date: LocalDate; revenue: Fils; bookings: number }[];
  byCategory: { categoryId: ID; name: LocalizedText; bookings: number; revenue: Fils }[];
  byStatus: Record<BookingStatus, number>;
  topTechnicians: { technician: TechnicianSummary; jobs: number; revenue: Fils }[];
  recentBookings: BookingView[];
}

export type BookingSort = 'scheduled_desc' | 'scheduled_asc' | 'created_desc' | 'total_desc';

export interface AdminBookingQuery {
  page?: number;
  pageSize?: number;
  status?: BookingStatus[];
  categoryId?: ID;
  vendorId?: ID;
  technicianId?: ID;
  customerId?: ID;
  search?: string;
  from?: LocalDate;
  to?: LocalDate;
  sort?: BookingSort;
}

export interface CustomerRow extends Customer {
  bookingsCount: number;
  totalSpent: Fils;
  lastBookingAt: ISODateTime | null;
}

export interface TechnicianRow extends Technician {
  vendorName: LocalizedText | null;
}

export interface VendorRow extends Vendor {
  techniciansCount: number;
  jobsCompleted: number;
  revenue: Fils;
  rating: number;
}

export interface EligibleTechnician {
  technician: TechnicianSummary;
  isFree: boolean;
  isOnline: boolean;
}

export interface PayoutRow extends Payout {
  payeeName: LocalizedText;
}

export interface TicketRow extends SupportTicket {
  requesterName: string;
}

export type VendorInput = Pick<
  Vendor,
  | 'name'
  | 'legalName'
  | 'crNumber'
  | 'contactName'
  | 'phone'
  | 'email'
  | 'categoryIds'
  | 'governorateIds'
  | 'commissionRate'
>;

export type CouponInput = Omit<Coupon, 'id' | 'usedCount'> & { id?: ID };

export interface AdminApi {
  getDashboard(): Promise<AdminDashboard>;
  getProfile(): Promise<AdminUser>;

  listBookings(query?: AdminBookingQuery): Promise<Paginated<BookingView>>;
  getBooking(id: ID): Promise<BookingView>;
  listEligibleTechnicians(bookingId: ID): Promise<EligibleTechnician[]>;
  assignTechnician(bookingId: ID, technicianId: ID): Promise<BookingView>;
  updateBookingStatus(bookingId: ID, status: BookingStatus, note?: string): Promise<BookingView>;

  listCustomers(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<CustomerRow>>;
  getCustomer(id: ID): Promise<CustomerRow>;
  setCustomerStatus(id: ID, status: Customer['status']): Promise<CustomerRow>;

  listTechnicians(query?: {
    status?: TechnicianStatus;
    vendorId?: ID | 'independent';
    categoryId?: ID;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<TechnicianRow>>;
  getTechnician(id: ID): Promise<TechnicianRow>;
  setTechnicianStatus(id: ID, status: TechnicianStatus): Promise<TechnicianRow>;
  reviewTechnicianDocument(
    technicianId: ID,
    documentId: ID,
    status: Extract<DocumentStatus, 'verified' | 'rejected'>,
  ): Promise<TechnicianRow>;

  listVendors(): Promise<VendorRow[]>;
  getVendor(id: ID): Promise<VendorRow>;
  createVendor(input: VendorInput): Promise<VendorRow>;
  updateVendor(id: ID, patch: Partial<VendorInput>): Promise<VendorRow>;
  setVendorStatus(id: ID, status: VendorStatus): Promise<VendorRow>;

  listCategories(): Promise<ServiceCategory[]>;
  updateCategory(
    id: ID,
    patch: Partial<Pick<ServiceCategory, 'name' | 'description' | 'isActive' | 'sortOrder'>>,
  ): Promise<ServiceCategory>;
  listServices(filter?: { categoryId?: ID; search?: string }): Promise<Service[]>;
  updateService(
    id: ID,
    patch: Partial<
      Pick<Service, 'name' | 'shortDescription' | 'basePrice' | 'isActive' | 'isPopular'>
    >,
  ): Promise<Service>;

  listCoupons(): Promise<Coupon[]>;
  saveCoupon(input: CouponInput): Promise<Coupon>;
  setCouponActive(id: ID, isActive: boolean): Promise<Coupon>;

  listReviews(query?: {
    status?: ReviewStatus;
    maxRating?: number;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<ReviewView>>;
  setReviewStatus(id: ID, status: ReviewStatus): Promise<ReviewView>;

  listPayouts(query?: {
    status?: PayoutStatus;
    payeeType?: Payout['payeeType'];
  }): Promise<PayoutRow[]>;
  markPayoutPaid(id: ID): Promise<PayoutRow>;

  listTickets(query?: { status?: TicketStatus }): Promise<TicketRow[]>;
  getTicket(id: ID): Promise<TicketRow>;
  replyToTicket(id: ID, text: string): Promise<TicketRow>;
  setTicketStatus(id: ID, status: TicketStatus): Promise<TicketRow>;
}

// ─── Root ────────────────────────────────────────────────────────────────────

export interface MyHomeApi {
  auth: AuthApi;
  catalog: CatalogApi;
  bookings: CustomerBookingsApi;
  account: CustomerAccountApi;
  notifications: NotificationsApi;
  chat: ChatApi;
  support: SupportApi;
  technician: TechnicianApi;
  admin: AdminApi;
}
