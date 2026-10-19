/** Display labels for domain enums, shared by mobile and admin for consistent wording. */
import { brand } from '../brand/brand.config';
import type { BookingStatus, PaymentMethod, PaymentStatus } from '../types/booking';
import type { LocalizedText } from '../types/common';
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  WalletTransactionType,
} from '../types/engagement';
import type {
  DocumentStatus,
  MembershipTier,
  SpokenLanguage,
  TechnicianDocumentType,
  TechnicianStatus,
  VendorStatus,
} from '../types/user';

export type StatusTone = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'danger';

export const bookingStatusLabels: Record<BookingStatus, LocalizedText> = {
  pending: { en: 'Awaiting confirmation', ar: 'بانتظار التأكيد' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  on_the_way: { en: 'On the way', ar: 'في الطريق' },
  arrived: { en: 'Technician arrived', ar: 'وصل الفني' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
};

export const bookingStatusTone: Record<BookingStatus, StatusTone> = {
  pending: 'warning',
  confirmed: 'info',
  on_the_way: 'accent',
  arrived: 'accent',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'danger',
};

export const paymentMethodLabels: Record<PaymentMethod, LocalizedText> = {
  knet: { en: 'KNET', ar: 'كي نت' },
  card: { en: 'Credit / debit card', ar: 'بطاقة ائتمان / خصم' },
  apple_pay: { en: 'Apple Pay', ar: 'Apple Pay' },
  cash: { en: 'Cash after service', ar: 'نقداً بعد الخدمة' },
  wallet: { en: `${brand.name} Wallet`, ar: `محفظة ${brand.name_ar}` },
};

export const paymentStatusLabels: Record<PaymentStatus, LocalizedText> = {
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع' },
  paid: { en: 'Paid', ar: 'مدفوع' },
  partially_refunded: { en: 'Partially refunded', ar: 'مسترد جزئياً' },
  refunded: { en: 'Refunded', ar: 'مسترد' },
};

export const technicianStatusLabels: Record<TechnicianStatus, LocalizedText> = {
  pending_approval: { en: 'Pending approval', ar: 'بانتظار الموافقة' },
  active: { en: 'Active', ar: 'نشط' },
  suspended: { en: 'Suspended', ar: 'موقوف' },
};

export const vendorStatusLabels: Record<VendorStatus, LocalizedText> = technicianStatusLabels;

export const documentTypeLabels: Record<TechnicianDocumentType, LocalizedText> = {
  civil_id: { en: 'Civil ID', ar: 'البطاقة المدنية' },
  trade_license: { en: 'Trade licence', ar: 'الرخصة التجارية' },
  certificate: { en: 'Professional certificate', ar: 'الشهادة المهنية' },
  insurance: { en: 'Liability insurance', ar: 'تأمين المسؤولية' },
};

export const documentStatusTone: Record<DocumentStatus, StatusTone> = {
  verified: 'success',
  pending: 'info',
  rejected: 'danger',
  expired: 'warning',
};

export const spokenLanguageLabels: Record<SpokenLanguage, LocalizedText> = {
  en: { en: 'English', ar: 'الإنجليزية' },
  ar: { en: 'Arabic', ar: 'العربية' },
  hi: { en: 'Hindi', ar: 'الهندية' },
  ur: { en: 'Urdu', ar: 'الأردية' },
  ml: { en: 'Malayalam', ar: 'المالايالامية' },
  tl: { en: 'Tagalog', ar: 'التاغالوغية' },
  bn: { en: 'Bengali', ar: 'البنغالية' },
};

export const documentStatusLabels: Record<DocumentStatus, LocalizedText> = {
  verified: { en: 'Verified', ar: 'موثّق' },
  pending: { en: 'Under review', ar: 'قيد المراجعة' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  expired: { en: 'Expired', ar: 'منتهي' },
};

export const membershipLabels: Record<MembershipTier, LocalizedText> = {
  classic: { en: 'Classic', ar: 'كلاسيك' },
  gold: { en: 'Gold', ar: 'ذهبي' },
  platinum: { en: 'Platinum', ar: 'بلاتيني' },
};

export const ticketStatusLabels: Record<TicketStatus, LocalizedText> = {
  open: { en: 'Open', ar: 'مفتوحة' },
  in_progress: { en: 'In progress', ar: 'قيد المعالجة' },
  resolved: { en: 'Resolved', ar: 'تم الحل' },
  closed: { en: 'Closed', ar: 'مغلقة' },
};

export const ticketStatusTone: Record<TicketStatus, StatusTone> = {
  open: 'info',
  in_progress: 'accent',
  resolved: 'success',
  closed: 'neutral',
};

export const ticketCategoryLabels: Record<TicketCategory, LocalizedText> = {
  booking: { en: 'A booking', ar: 'حجز' },
  payment: { en: 'Payments & refunds', ar: 'المدفوعات والاسترداد' },
  technician: { en: 'A professional', ar: 'محترف' },
  app: { en: 'Using the app', ar: 'استخدام التطبيق' },
  other: { en: 'Something else', ar: 'أمر آخر' },
};

export const walletTransactionLabels: Record<WalletTransactionType, LocalizedText> = {
  top_up: { en: 'Top-up', ar: 'شحن' },
  payment: { en: 'Payment', ar: 'دفع' },
  refund: { en: 'Refund', ar: 'استرداد' },
  cashback: { en: 'Cashback', ar: 'استرجاع نقدي' },
};

export const ticketPriorityLabels: Record<TicketPriority, LocalizedText> = {
  low: { en: 'Low', ar: 'منخفضة' },
  normal: { en: 'Normal', ar: 'عادية' },
  high: { en: 'High', ar: 'عالية' },
  urgent: { en: 'Urgent', ar: 'عاجلة' },
};
