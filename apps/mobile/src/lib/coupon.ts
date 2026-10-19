import type { CouponResult } from '@myhome/shared';

/** Promo codes are case-insensitive and never contain spaces. */
export function normalizeCouponCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export type CouponFeedbackKey =
  | 'checkout.couponApplied'
  | 'checkout.couponNotFound'
  | 'checkout.couponExpired'
  | 'checkout.couponNotStarted'
  | 'checkout.couponInactive'
  | 'checkout.couponLimit'
  | 'checkout.couponMinSpend'
  | 'checkout.couponCategory'
  | 'checkout.couponFirstBooking';

/** Maps the API's coupon verdict to a translation key for the customer. */
export function couponFeedbackKey(result: CouponResult): CouponFeedbackKey {
  if (result.status === 'applied') return 'checkout.couponApplied';
  switch (result.reason) {
    case 'not_found':
      return 'checkout.couponNotFound';
    case 'expired':
      return 'checkout.couponExpired';
    case 'not_started':
      return 'checkout.couponNotStarted';
    case 'inactive':
      return 'checkout.couponInactive';
    case 'usage_limit_reached':
      return 'checkout.couponLimit';
    case 'min_subtotal_not_met':
      return 'checkout.couponMinSpend';
    case 'category_not_eligible':
      return 'checkout.couponCategory';
    case 'first_booking_only':
      return 'checkout.couponFirstBooking';
  }
}
