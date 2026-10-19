/** Display labels for domain enums, shared by mobile and admin for consistent wording. */
import { brand } from '../brand/brand.config';
import type { BookingStatus, PaymentMethod, PaymentStatus } from '../types/booking';
import type { LocalizedText } from '../types/common';
import type { TicketPriority, TicketStatus } from '../types/engagement';
import type { DocumentStatus, MembershipTier, TechnicianStatus, VendorStatus } from '../types/user';

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

export const ticketPriorityLabels: Record<TicketPriority, LocalizedText> = {
  low: { en: 'Low', ar: 'منخفضة' },
  normal: { en: 'Normal', ar: 'عادية' },
  high: { en: 'High', ar: 'عالية' },
  urgent: { en: 'Urgent', ar: 'عاجلة' },
};
