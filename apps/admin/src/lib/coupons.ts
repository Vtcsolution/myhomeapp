/**
 * Coupon form helpers. Money is typed in KWD and stored in fils; validity is
 * picked as Kuwait calendar dates (from the start of the first day to the end
 * of the last day). The API validates everything again.
 */
import {
  addDaysToLocalDate,
  type Coupon,
  type CouponInput,
  type CouponType,
  type ID,
  kuwaitDateOf,
  kuwaitLocalToISO,
  type LocalDate,
  parseKwdToFils,
  toMs,
} from '@myhome/shared';
import { kwdInput } from './pricingForm';

export type CouponState = 'active' | 'inactive' | 'expired' | 'upcoming' | 'exhausted';

export function couponState(coupon: Coupon, now: number): CouponState {
  if (!coupon.isActive) return 'inactive';
  if (toMs(coupon.validUntil) <= now) return 'expired';
  if (toMs(coupon.validFrom) > now) return 'upcoming';
  if (coupon.usedCount >= coupon.usageLimit) return 'exhausted';
  return 'active';
}

export const couponStateTone = {
  active: 'success',
  inactive: 'neutral',
  expired: 'neutral',
  upcoming: 'info',
  exhausted: 'warning',
} as const;

export interface CouponDraft {
  id?: ID;
  code: string;
  descriptionEn: string;
  descriptionAr: string;
  type: CouponType;
  /** Percent for `percent`, KWD for `fixed`. */
  value: string;
  maxDiscount: string;
  minSubtotal: string;
  categoryIds: ID[];
  firstBookingOnly: boolean;
  validFrom: LocalDate;
  validUntil: LocalDate;
  usageLimit: string;
  isActive: boolean;
}

export function newCouponDraft(now: number): CouponDraft {
  const today = kuwaitDateOf(now);
  return {
    code: '',
    descriptionEn: '',
    descriptionAr: '',
    type: 'percent',
    value: '10',
    maxDiscount: '',
    minSubtotal: '0.000',
    categoryIds: [],
    firstBookingOnly: false,
    validFrom: today,
    validUntil: addDaysToLocalDate(today, 30),
    usageLimit: '100',
    isActive: true,
  };
}

export function draftFromCoupon(coupon: Coupon): CouponDraft {
  // validUntil is stored as the start of the following day; show the last valid day.
  const until = kuwaitDateOf(toMs(coupon.validUntil) - 1);
  return {
    id: coupon.id,
    code: coupon.code,
    descriptionEn: coupon.description.en,
    descriptionAr: coupon.description.ar,
    type: coupon.type,
    value: coupon.type === 'percent' ? String(coupon.value) : kwdInput(coupon.value),
    maxDiscount: coupon.maxDiscount ? kwdInput(coupon.maxDiscount) : '',
    minSubtotal: kwdInput(coupon.minSubtotal),
    categoryIds: coupon.categoryIds,
    firstBookingOnly: coupon.firstBookingOnly,
    validFrom: kuwaitDateOf(coupon.validFrom),
    validUntil: until,
    usageLimit: String(coupon.usageLimit),
    isActive: coupon.isActive,
  };
}

export type CouponField =
  'code' | 'value' | 'maxDiscount' | 'minSubtotal' | 'usageLimit' | 'dates' | 'description';

export function couponFromDraft(draft: CouponDraft): {
  input: CouponInput | null;
  errors: CouponField[];
} {
  const errors: CouponField[] = [];
  const code = draft.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) errors.push('code');
  if (!draft.descriptionEn.trim() || !draft.descriptionAr.trim()) errors.push('description');

  let value: number | null;
  if (draft.type === 'percent') {
    const n = Number(draft.value);
    value = draft.value.trim() && Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
  } else {
    const fils = parseKwdToFils(draft.value);
    value = fils !== null && fils > 0 ? fils : null;
  }
  if (value === null) errors.push('value');

  let maxDiscount: number | undefined;
  if (draft.type === 'percent' && draft.maxDiscount.trim()) {
    const fils = parseKwdToFils(draft.maxDiscount);
    if (fils === null || fils <= 0) errors.push('maxDiscount');
    else maxDiscount = fils;
  }

  const minSubtotal = parseKwdToFils(draft.minSubtotal || '0');
  if (minSubtotal === null) errors.push('minSubtotal');

  const usageLimit = Number(draft.usageLimit);
  if (!Number.isInteger(usageLimit) || usageLimit < 1) errors.push('usageLimit');

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !datePattern.test(draft.validFrom) ||
    !datePattern.test(draft.validUntil) ||
    draft.validUntil < draft.validFrom
  ) {
    errors.push('dates');
  }

  if (errors.length || value === null || minSubtotal === null) return { input: null, errors };
  return {
    errors,
    input: {
      ...(draft.id ? { id: draft.id } : {}),
      code,
      description: { en: draft.descriptionEn.trim(), ar: draft.descriptionAr.trim() },
      type: draft.type,
      value,
      ...(maxDiscount !== undefined ? { maxDiscount } : {}),
      minSubtotal,
      categoryIds: draft.categoryIds,
      firstBookingOnly: draft.firstBookingOnly,
      validFrom: kuwaitLocalToISO(draft.validFrom),
      validUntil: kuwaitLocalToISO(addDaysToLocalDate(draft.validUntil, 1)),
      usageLimit,
      isActive: draft.isActive,
    },
  };
}
