import type { Fils, ID, ISODateTime, Locale, LocalizedText } from './common';
import type { Address, GovernorateId } from './geo';

export type UserRole = 'customer' | 'technician' | 'admin';

export type MembershipTier = 'classic' | 'gold' | 'platinum';

export interface Customer {
  id: ID;
  fullName: string;
  /** E.164, e.g. `+96555550101`. */
  phone: string;
  email?: string;
  preferredLocale: Locale;
  membership: MembershipTier;
  addresses: Address[];
  walletBalance: Fils;
  status: 'active' | 'blocked';
  createdAt: ISODateTime;
}

export type VendorStatus = 'pending_approval' | 'active' | 'suspended';

/** A company that employs and manages several technicians. */
export interface Vendor {
  id: ID;
  name: LocalizedText;
  legalName: string;
  /** Commercial registration number. */
  crNumber: string;
  contactName: string;
  phone: string;
  email: string;
  categoryIds: ID[];
  governorateIds: GovernorateId[];
  /** Platform commission charged on this vendor's completed jobs (0–1). */
  commissionRate: number;
  status: VendorStatus;
  joinedAt: ISODateTime;
}

export type TechnicianStatus = 'pending_approval' | 'active' | 'suspended';

export type TechnicianDocumentType = 'civil_id' | 'trade_license' | 'certificate' | 'insurance';
export type DocumentStatus = 'verified' | 'pending' | 'rejected' | 'expired';

export interface TechnicianDocument {
  id: ID;
  type: TechnicianDocumentType;
  status: DocumentStatus;
  uploadedAt: ISODateTime;
  expiresAt?: ISODateTime;
}

export type SpokenLanguage = 'en' | 'ar' | 'hi' | 'ur' | 'ml' | 'tl' | 'bn';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayAvailability {
  /** "HH:mm" in Kuwait time. */
  start: string;
  end: string;
}

export interface TechnicianAvailability {
  /** `null` means the technician is off on that weekday. */
  weekly: Record<Weekday, DayAvailability | null>;
  /** Specific days off, `YYYY-MM-DD`. */
  daysOff: string[];
}

export interface Technician {
  id: ID;
  fullName: LocalizedText;
  phone: string;
  /** `null` for independent technicians. */
  vendorId: ID | null;
  categoryIds: ID[];
  governorateIds: GovernorateId[];
  headline: LocalizedText;
  bio: LocalizedText;
  languages: SpokenLanguage[];
  yearsExperience: number;
  /** Aggregates — derived from reviews and completed bookings. */
  rating: number;
  reviewsCount: number;
  jobsCompleted: number;
  status: TechnicianStatus;
  isOnline: boolean;
  availability: TechnicianAvailability;
  documents: TechnicianDocument[];
  joinedAt: ISODateTime;
}

export type AdminRole = 'super_admin' | 'operations' | 'support' | 'finance';

export interface AdminUser {
  id: ID;
  fullName: string;
  email: string;
  role: AdminRole;
}
