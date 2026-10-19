import {
  type AdminDashboard,
  calculatePrice,
  defaultSelections,
  type Service,
} from '@myhome/shared';
import { createSeedState } from '@myhome/shared/mock';
import { describe, expect, it } from 'vitest';
import { defaultAlerts } from '@/services/preferences';
import { buildAlerts } from './alerts';
import {
  emptyFilters,
  hasActiveFilters,
  parseBookingFilters,
  toBookingQuery,
  toSearchParams,
} from './bookingQuery';
import { couponFromDraft, couponState, draftFromCoupon, newCouponDraft } from './coupons';
import { missingMedia, serviceImageChoices } from './media';
import { draftFromService, pricingFromDraft, previewService } from './pricingForm';
import { nextSort, paginate, sortRows } from './sort';
import { canApprove, documentsNeedingAttention } from './technicians';

const NOW = Date.parse('2026-10-19T07:30:00.000Z');
const DAY = 86_400_000;
const seed = createSeedState({ now: NOW });

describe('sorting and paging', () => {
  const rows = [
    { n: 'b', v: 2 },
    { n: 'a', v: null },
    { n: 'c', v: 1 },
  ];
  it('sorts numbers both ways and keeps empty values last', () => {
    const value = (r: (typeof rows)[number]) => r.v;
    expect(sortRows(rows, { key: 'v', direction: 'asc' }, value).map((r) => r.n)).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(sortRows(rows, { key: 'v', direction: 'desc' }, value).map((r) => r.n)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(sortRows(rows, null, value)).toEqual(rows);
  });
  it('toggles direction on the same column and starts descending on a new one', () => {
    expect(nextSort(null, 'a')).toEqual({ key: 'a', direction: 'desc' });
    expect(nextSort({ key: 'a', direction: 'desc' }, 'a')).toEqual({ key: 'a', direction: 'asc' });
    expect(nextSort({ key: 'a', direction: 'asc' }, 'b')).toEqual({ key: 'b', direction: 'desc' });
  });
  it('clamps the page into range', () => {
    expect(paginate([1, 2, 3, 4, 5], 9, 2)).toMatchObject({
      items: [5],
      page: 3,
      pages: 3,
      total: 5,
    });
  });
});

describe('booking filters in the URL', () => {
  it('round-trips through search params and drops defaults', () => {
    const filters = {
      ...emptyFilters,
      q: 'noura',
      status: ['pending', 'confirmed'] as const,
      categoryId: 'cat-ac',
      from: '2026-10-01',
      sort: 'total_desc' as const,
      page: 2,
    };
    const params = toSearchParams({ ...filters, status: [...filters.status] });
    expect(params.toString()).toBe(
      'q=noura&status=pending&status=confirmed&category=cat-ac&from=2026-10-01&sort=total_desc&page=2',
    );
    expect(parseBookingFilters(params)).toEqual({ ...filters, status: ['pending', 'confirmed'] });
    expect(toSearchParams(emptyFilters).toString()).toBe('');
    expect(hasActiveFilters(emptyFilters)).toBe(false);
  });
  it('ignores unknown statuses, bad dates and bad pages', () => {
    const parsed = parseBookingFilters(
      new URLSearchParams('status=nope&status=pending&from=19-10-2026&page=-3&sort=x'),
    );
    expect(parsed).toMatchObject({
      status: ['pending'],
      from: '',
      page: 1,
      sort: 'scheduled_desc',
    });
  });
  it('builds the API query with only the filters in use', () => {
    expect(toBookingQuery({ ...emptyFilters, technicianId: 'tec-01' }, 20)).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'scheduled_desc',
      technicianId: 'tec-01',
    });
  });
});

describe('alerts', () => {
  const dashboard = {
    kpis: { pendingApprovals: 2 },
    alerts: {
      unassignedSoon: 1,
      pendingExtraCharges: 0,
      openTickets: 3,
      flaggedReviews: 0,
      documentsExpiring: 0,
      payoutsDue: 4,
    },
  } as unknown as Pick<AdminDashboard, 'alerts' | 'kpis'>;

  it('lists non-zero alerts, most urgent first, each with a pre-filtered link', () => {
    expect(buildAlerts(dashboard, defaultAlerts).map((a) => [a.key, a.count, a.href])).toEqual([
      ['unassignedSoon', 1, '/bookings?status=pending&sort=scheduled_asc'],
      ['payoutsDue', 4, '/payouts?view=due'],
      ['pendingApprovals', 2, '/technicians?status=pending_approval'],
      ['openTickets', 3, '/tickets?status=unresolved'],
    ]);
  });
  it('respects alert preferences', () => {
    const keys = buildAlerts(dashboard, {
      ...defaultAlerts,
      payoutsDue: false,
      openTickets: false,
    }).map((a) => a.key);
    expect(keys).toEqual(['unassignedSoon', 'pendingApprovals']);
  });
});

describe('professional documents', () => {
  const doc = (
    status: 'verified' | 'pending' | 'rejected' | 'expired',
    expiresInDays?: number,
  ) => ({
    id: `d-${status}-${expiresInDays}`,
    type: 'civil_id' as const,
    status,
    uploadedAt: new Date(NOW - 100 * DAY).toISOString(),
    ...(expiresInDays !== undefined
      ? { expiresAt: new Date(NOW + expiresInDays * DAY).toISOString() }
      : {}),
  });

  it('never allows approval while a document is missing or not verified', () => {
    expect(canApprove({ status: 'pending_approval', documents: [] })).toBe(false);
    expect(
      canApprove({ status: 'pending_approval', documents: [doc('verified'), doc('pending')] }),
    ).toBe(false);
    expect(
      canApprove({ status: 'pending_approval', documents: [doc('verified'), doc('rejected')] }),
    ).toBe(false);
    expect(
      canApprove({
        status: 'pending_approval',
        documents: [doc('verified'), doc('verified', 200)],
      }),
    ).toBe(true);
    expect(canApprove({ status: 'active', documents: [doc('verified')] })).toBe(false);
  });

  it('flags expired and soon-expiring documents for active professionals only', () => {
    const documents = [doc('verified', 200), doc('verified', 10), doc('expired')];
    expect(documentsNeedingAttention({ status: 'active', documents }, NOW)).toHaveLength(2);
    expect(documentsNeedingAttention({ status: 'suspended', documents }, NOW)).toHaveLength(0);
  });
});

describe('service pricing form', () => {
  const service = seed.services.find(
    (s) => s.optionGroups.length > 0 && s.addOns.length > 0,
  ) as Service;

  it('starts unchanged and sends only edited prices, in fils', () => {
    const draft = draftFromService(service);
    expect(pricingFromDraft(service, draft)).toEqual({ input: {}, errors: {}, changed: false });

    const addOn = service.addOns[0]!;
    const next = { ...draft, basePrice: '12.5', addOns: { ...draft.addOns, [addOn.id]: '3.250' } };
    const result = pricingFromDraft(service, next);
    expect(result.errors).toEqual({});
    expect(result.input).toEqual({ basePrice: 12_500, addOnPrices: { [addOn.id]: 3_250 } });
  });

  it('accepts discounted options but not one that makes the price zero or less', () => {
    const svc = seed.services.find((s) => s.id === 'svc-ac-cleaning')!;
    const draft = draftFromService(svc);
    expect(draft.options.window).toBe('-2.000');
    expect(pricingFromDraft(svc, draft).errors).toEqual({});
    expect(
      pricingFromDraft(svc, { ...draft, options: { ...draft.options, window: '−3' } }).input,
    ).toEqual({
      optionPrices: { window: -3_000 },
    });
    expect(
      pricingFromDraft(svc, { ...draft, options: { ...draft.options, window: '-8' } }).errors,
    ).toEqual({
      'option:window': 'floor',
    });
  });

  it('rejects zero or malformed amounts and impossible unit limits', () => {
    const draft = draftFromService(service);
    const choice = service.optionGroups[0]!.choices[0]!;
    const result = pricingFromDraft(service, {
      ...draft,
      basePrice: '0',
      minUnits: '3',
      maxUnits: '2',
      options: { ...draft.options, [choice.id]: '1.2345' },
    });
    expect(result.errors).toMatchObject({
      basePrice: 'amount',
      units: 'units',
      [`option:${choice.id}`]: 'amount',
    });
  });

  it('previews the new price with the shared pricing engine', () => {
    const preview = previewService(service, { basePrice: service.basePrice + 1_000 });
    const before = calculatePrice({ service, selections: defaultSelections(service) });
    const after = calculatePrice({ service: preview, selections: defaultSelections(preview) });
    const units = defaultSelections(service).units;
    expect(after.subtotal - before.subtotal).toBe(1_000 * units);
  });
});

describe('coupon form', () => {
  it('converts a new percentage coupon to API input with Kuwait day boundaries', () => {
    const draft = {
      ...newCouponDraft(NOW),
      code: 'eid25',
      descriptionEn: 'Eid',
      descriptionAr: 'عيد',
      value: '25',
      maxDiscount: '5',
    };
    const { input, errors } = couponFromDraft(draft);
    expect(errors).toEqual([]);
    expect(input).toMatchObject({
      code: 'EID25',
      type: 'percent',
      value: 25,
      maxDiscount: 5_000,
      minSubtotal: 0,
      usageLimit: 100,
    });
    // 2026-10-19 00:00 Kuwait = 2026-10-18 21:00 UTC; valid through the 30th day.
    expect(input?.validFrom).toBe('2026-10-18T21:00:00.000Z');
    expect(input?.validUntil).toBe('2026-11-18T21:00:00.000Z');
  });

  it('reports every invalid field', () => {
    const { input, errors } = couponFromDraft({
      ...newCouponDraft(NOW),
      code: 'a b',
      value: '150',
      usageLimit: '0',
      validFrom: '2026-10-20',
      validUntil: '2026-10-19',
    });
    expect(input).toBeNull();
    expect(errors.sort()).toEqual(['code', 'dates', 'description', 'usageLimit', 'value']);
  });

  it('edits round-trip and report the coupon state', () => {
    const coupon = seed.coupons[0]!;
    const { input } = couponFromDraft(draftFromCoupon(coupon));
    expect(input).toMatchObject({
      id: coupon.id,
      code: coupon.code,
      value: coupon.value,
      categoryIds: coupon.categoryIds,
    });
    expect(couponState({ ...coupon, isActive: false }, NOW)).toBe('inactive');
    expect(couponState({ ...coupon, validUntil: new Date(NOW - DAY).toISOString() }, NOW)).toBe(
      'expired',
    );
    expect(
      couponState(
        {
          ...coupon,
          validFrom: new Date(NOW + DAY).toISOString(),
          validUntil: new Date(NOW + 9 * DAY).toISOString(),
        },
        NOW,
      ),
    ).toBe('upcoming');
    expect(
      couponState(
        {
          ...coupon,
          validFrom: new Date(NOW - DAY).toISOString(),
          validUntil: new Date(NOW + DAY).toISOString(),
          usedCount: 5,
          usageLimit: 5,
        },
        NOW,
      ),
    ).toBe('exhausted');
  });
});

describe('catalogue images', () => {
  it('has a bundled photo for every media key', () => {
    expect(missingMedia()).toEqual([]);
    expect(serviceImageChoices.length).toBeGreaterThan(10);
  });
});
