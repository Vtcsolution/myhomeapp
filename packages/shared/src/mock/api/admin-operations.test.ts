/**
 * Admin operations used by the dashboard: permissions, assignment rules,
 * status changes, pricing edits, coupons, dashboard figures, filters and the
 * shared-state hand-over between apps.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { allowedTransitions } from '../../domain/bookingStatus';
import { calculatePrice } from '../../domain/pricing';
import { createTranslator } from '../../i18n/translator';
import { DEMO_ACCOUNTS } from '../data/people';
import { createMockApi, type MockApi } from './createMockApi';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
let api: MockApi;

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (e) {
    return e instanceof ApiError ? e.code : 'unknown';
  }
}

async function asAdmin() {
  await api.auth.signOut();
  await api.auth.adminSignIn(DEMO_ACCOUNTS.adminEmail, DEMO_ACCOUNTS.adminPassword);
}

async function asCustomer() {
  await api.auth.signOut();
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
  await api.auth.verifyOtp(c.requestId, '1234');
}

async function asTechnician(phone: string = DEMO_ACCOUNTS.technicianPhone) {
  await api.auth.signOut();
  const c = await api.auth.requestOtp(phone, 'technician');
  await api.auth.verifyOtp(c.requestId, '1234');
}

beforeEach(async () => {
  api = createMockApi({
    now: () => NOW,
    latency: 0,
    autoConfirmAfterSec: null,
    simulatedReplyAfterSec: null,
  });
  await asAdmin();
});

describe('permissions', () => {
  it('rejects wrong admin credentials', async () => {
    await api.auth.signOut();
    expect(await code(api.auth.adminSignIn(DEMO_ACCOUNTS.adminEmail, 'wrong'))).not.toBe('ok');
  });

  it('keeps admin operations away from customers and technicians', async () => {
    await asCustomer();
    expect(await code(api.admin.getDashboard())).toBe('FORBIDDEN');
    await asTechnician();
    expect(await code(api.admin.listBookings())).toBe('FORBIDDEN');
    await api.auth.signOut();
    expect(await code(api.admin.listCustomers())).toBe('UNAUTHORIZED');
  });
});

describe('dashboard figures come from the data', () => {
  it('matches the database for counts, fees, satisfaction and alerts', async () => {
    const dashboard = await api.admin.getDashboard();
    const state = api.exportState();
    const k = dashboard.kpis;
    expect(k.customers).toBe(state.customers.length);
    expect(k.technicians).toBe(state.technicians.length);
    expect(k.bookingsTotal).toBe(state.bookings.length);
    expect(Object.values(dashboard.byStatus).reduce((a, b) => a + b, 0)).toBe(k.bookingsTotal);
    expect(k.activeBookings).toBe(
      dashboard.byStatus.confirmed +
        dashboard.byStatus.on_the_way +
        dashboard.byStatus.arrived +
        dashboard.byStatus.in_progress,
    );
    expect(k.platformFeesMonth).toBeGreaterThan(0);
    expect(k.platformFeesMonth).toBeLessThan(k.revenueMonth);
    const published = state.reviews.filter((r) => r.status === 'published');
    expect(k.reviewsCount).toBe(published.length);
    expect(k.satisfactionRate).toBeCloseTo(
      published.filter((r) => r.rating >= 4).length / published.length,
    );
    expect(dashboard.alerts.openTickets).toBe(
      state.tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    );
    expect(dashboard.alerts.flaggedReviews).toBe(
      state.reviews.filter((r) => r.status === 'flagged').length,
    );
  });
});

describe('booking management', () => {
  it('assigns only eligible, free technicians and the technician then sees the job', async () => {
    const { items } = await api.admin.listBookings({ status: ['pending'] });
    const booking = items[0]!;
    const eligible = await api.admin.listEligibleTechnicians(booking.id);
    const free = eligible.find((e) => e.isFree)!;
    expect(free).toBeDefined();

    const outsider = api
      .exportState()
      .technicians.find(
        (t) => !t.categoryIds.includes(booking.categoryId) && t.status === 'active',
      )!;
    expect(await code(api.admin.assignTechnician(booking.id, outsider.id))).toBe('VALIDATION');

    const assigned = await api.admin.assignTechnician(booking.id, free.technician.id);
    expect(assigned.status).toBe('confirmed');
    expect(assigned.technician?.id).toBe(free.technician.id);

    const phone = api.exportState().technicians.find((t) => t.id === free.technician.id)!.phone;
    await asTechnician(phone);
    expect((await api.technician.listJobs('upcoming')).map((j) => j.id)).toContain(booking.id);
  });

  it('refuses a technician who is busy at that time', async () => {
    const state = api.exportState();
    const live = state.bookings.find((b) => b.id === 'bkg-demo-live')!;
    const pending = state.bookings.find(
      (b) => b.status === 'pending' && b.categoryId === live.categoryId,
    )!;
    pending.scheduledStart = live.scheduledStart;
    pending.scheduledEnd = live.scheduledEnd;
    pending.address = { ...live.address };
    api.loadState(state);
    expect(await code(api.admin.assignTechnician(pending.id, live.technicianId!))).toBe('CONFLICT');
  });

  it('allows only legal status changes', async () => {
    expect(allowedTransitions('confirmed', 'admin')).toEqual(['on_the_way', 'cancelled']);
    expect(allowedTransitions('completed', 'admin')).toEqual([]);
    expect(allowedTransitions('confirmed', 'customer')).toEqual(['cancelled']);
    const live = await api.admin.getBooking('bkg-demo-live');
    expect(await code(api.admin.updateBookingStatus(live.id, 'completed'))).toBe('CONFLICT');
    expect((await api.admin.updateBookingStatus(live.id, 'arrived')).status).toBe('arrived');
    const cancelled = await api.admin.updateBookingStatus(
      live.id,
      'cancelled',
      'Customer unreachable',
    );
    expect(cancelled.cancellation?.by).toBe('admin');
    expect(await code(api.admin.updateBookingStatus(live.id, 'arrived'))).toBe('CONFLICT');
  });

  it('filters bookings by status, category, technician, date and search', async () => {
    const all = await api.admin.listBookings({ pageSize: 100 });
    const live = all.items.find((b) => b.id === 'bkg-demo-live')!;
    const byRef = await api.admin.listBookings({ search: live.reference });
    expect(byRef.items.map((b) => b.id)).toEqual([live.id]);
    const byTech = await api.admin.listBookings({
      technicianId: live.technicianId!,
      pageSize: 100,
    });
    expect(byTech.items.every((b) => b.technicianId === live.technicianId)).toBe(true);
    const byCat = await api.admin.listBookings({ categoryId: live.categoryId, pageSize: 100 });
    expect(byCat.items.every((b) => b.categoryId === live.categoryId)).toBe(true);
    const day = live.scheduledStart.slice(0, 10);
    const byDate = await api.admin.listBookings({ from: day, to: day, pageSize: 100 });
    expect(byDate.items.map((b) => b.id)).toContain(live.id);
    const done = await api.admin.listBookings({ status: ['completed'], sort: 'total_desc' });
    const totals = done.items.map((b) => b.price.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
  });
});

describe('catalogue and pricing', () => {
  it('updates prices so new quotes use them while existing bookings keep theirs', async () => {
    const before = api.exportState().bookings.find((b) => b.serviceId === 'svc-ac-cleaning')!;
    const service = (await api.admin.listServices()).find((s) => s.id === 'svc-ac-cleaning')!;
    const group = service.optionGroups[0]!;
    const choice = group.choices[1]!;
    const addOn = service.addOns[0]!;
    const updated = await api.admin.updateServicePricing(service.id, {
      basePrice: service.basePrice + 1_000,
      optionPrices: { [choice.id]: 2_500 },
      addOnPrices: { [addOn.id]: 3_250 },
      maxUnits: 12,
    });
    expect(updated.basePrice).toBe(service.basePrice + 1_000);
    expect(updated.maxUnits).toBe(12);

    await asCustomer();
    const selections = { options: { [group.id]: choice.id }, units: 1, addOnIds: [addOn.id] };
    const quote = await api.bookings.getQuote({ serviceId: service.id, selections });
    expect(quote.price.total).toBe(calculatePrice({ service: updated, selections }).total);
    expect(quote.price.items.find((l) => l.kind === 'addon')?.total).toBe(3_250);
    const still = api.exportState().bookings.find((b) => b.id === before.id)!;
    expect(still.price.total).toBe(before.price.total);
  });

  it('allows discounted options but never a zero or negative price', async () => {
    const id = 'svc-ac-cleaning';
    const service = (await api.admin.listServices()).find((s) => s.id === id)!;
    const choice = service.optionGroups[0]!.choices[1]!;
    const ok = await api.admin.updateServicePricing(id, { optionPrices: { [choice.id]: -1_000 } });
    expect(ok.optionGroups[0]!.choices[1]!.priceDelta).toBe(-1_000);
    expect(
      await code(
        api.admin.updateServicePricing(id, { optionPrices: { [choice.id]: -service.basePrice } }),
      ),
    ).toBe('VALIDATION');
    // Lowering the base price below an existing discount is rejected too.
    expect(await code(api.admin.updateServicePricing(id, { basePrice: 1_000 }))).toBe('VALIDATION');
  });

  it('rejects invalid prices and unknown options', async () => {
    const id = 'svc-ac-cleaning';
    expect(await code(api.admin.updateServicePricing(id, { basePrice: 0 }))).toBe('VALIDATION');
    expect(await code(api.admin.updateServicePricing(id, { basePrice: 12.5 }))).toBe('VALIDATION');
    expect(await code(api.admin.updateServicePricing(id, { minUnits: 5, maxUnits: 2 }))).toBe(
      'VALIDATION',
    );
    expect(await code(api.admin.updateServicePricing(id, { optionPrices: { nope: 1_000 } }))).toBe(
      'VALIDATION',
    );
    expect(await code(api.admin.updateServicePricing(id, { addOnPrices: { nope: 1_000 } }))).toBe(
      'VALIDATION',
    );
    const service = (await api.admin.listServices()).find((s) => s.id === id)!;
    expect(
      await code(
        api.admin.updateServicePricing(id, { addOnPrices: { [service.addOns[0]!.id]: -5 } }),
      ),
    ).toBe('VALIDATION');
    expect(await code(api.admin.updateService(id, { image: 'not-an-image' as never }))).toBe(
      'VALIDATION',
    );
    const edited = await api.admin.updateService(id, {
      description: { en: 'Deep coil clean.', ar: 'تنظيف عميق للملفات.' },
      image: 'service.ac-repair',
    });
    expect(edited.image).toBe('service.ac-repair');
  });

  it('hides a service from customers when deactivated', async () => {
    await api.admin.updateService('svc-ac-cleaning', { isActive: false });
    await asCustomer();
    expect(await code(api.catalog.getService('svc-ac-cleaning'))).toBe('NOT_FOUND');
  });
});

describe('coupons reach checkout', () => {
  it('a new coupon applies at checkout and stops applying when deactivated', async () => {
    const coupon = await api.admin.saveCoupon({
      code: 'opsdemo',
      description: { en: 'Ops demo', ar: 'تجربة' },
      type: 'fixed',
      value: 2_000,
      minSubtotal: 0,
      categoryIds: [],
      firstBookingOnly: false,
      validFrom: new Date(NOW - 3_600_000).toISOString(),
      validUntil: new Date(NOW + 30 * 86_400_000).toISOString(),
      usageLimit: 10,
      isActive: true,
    });
    expect(coupon.code).toBe('OPSDEMO');
    const request = {
      serviceId: 'svc-ac-cleaning',
      selections: { options: { 'ac-type': 'split' }, units: 1, addOnIds: [] },
      couponCode: 'OPSDEMO',
    };
    await asCustomer();
    expect((await api.bookings.getQuote(request)).coupon).toMatchObject({
      status: 'applied',
      discount: 2_000,
    });
    await asAdmin();
    await api.admin.setCouponActive(coupon.id, false);
    await asCustomer();
    expect((await api.bookings.getQuote(request)).coupon).toMatchObject({ status: 'rejected' });
  });
});

describe('coupon validation', () => {
  const base = {
    code: 'CHECKME',
    description: { en: 'Check', ar: 'تحقق' },
    type: 'percent' as const,
    value: 10,
    minSubtotal: 0,
    categoryIds: [],
    firstBookingOnly: false,
    validFrom: new Date(NOW).toISOString(),
    validUntil: new Date(NOW + 86_400_000).toISOString(),
    usageLimit: 5,
    isActive: true,
  };

  it('rejects invalid limits, amounts, descriptions and categories', async () => {
    expect(await code(api.admin.saveCoupon({ ...base, usageLimit: 0 }))).toBe('VALIDATION');
    expect(await code(api.admin.saveCoupon({ ...base, minSubtotal: -1 }))).toBe('VALIDATION');
    expect(await code(api.admin.saveCoupon({ ...base, maxDiscount: 0 }))).toBe('VALIDATION');
    expect(await code(api.admin.saveCoupon({ ...base, value: 101 }))).toBe('VALIDATION');
    expect(await code(api.admin.saveCoupon({ ...base, description: { en: ' ', ar: 'x' } }))).toBe(
      'VALIDATION',
    );
    expect(await code(api.admin.saveCoupon({ ...base, categoryIds: ['cat-nope'] }))).toBe(
      'VALIDATION',
    );
    expect(await code(api.admin.saveCoupon({ ...base, maxDiscount: 5_000 }))).toBe('ok');
  });

  it('edits keep the usage count and reject a duplicate code', async () => {
    const created = await api.admin.saveCoupon(base);
    const edited = await api.admin.saveCoupon({ ...base, id: created.id, value: 15 });
    expect(edited).toMatchObject({ id: created.id, value: 15, usedCount: 0 });
    const other = await api.admin.saveCoupon({ ...base, code: 'OTHER1' });
    expect(await code(api.admin.saveCoupon({ ...base, id: other.id }))).toBe('VALIDATION');
  });
});

describe('directory filters and approvals', () => {
  it('filters reviews by customer and technician, tickets by requester and booking', async () => {
    const reviews = await api.admin.listReviews({ customerId: 'cus-01', pageSize: 100 });
    expect(reviews.items.length).toBeGreaterThan(0);
    expect(reviews.items.every((r) => r.customerId === 'cus-01')).toBe(true);
    const byTech = await api.admin.listReviews({ technicianId: 'tec-01', pageSize: 100 });
    expect(byTech.items.every((r) => r.technicianId === 'tec-01')).toBe(true);
    const tickets = await api.admin.listTickets({ requesterId: 'cus-01' });
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => t.requesterId === 'cus-01')).toBe(true);
    const withBooking = tickets.find((t) => t.bookingId)!;
    expect(
      (await api.admin.listTickets({ bookingId: withBooking.bookingId })).map((t) => t.id),
    ).toContain(withBooking.id);
  });

  it('never approves a technician with unverified documents', async () => {
    const pending = (await api.admin.listTechnicians({ status: 'pending_approval' })).items[0]!;
    expect(pending.documents.some((d) => d.status !== 'verified')).toBe(true);
    expect(await code(api.admin.setTechnicianStatus(pending.id, 'active'))).toBe('VALIDATION');
  });
});

describe('shared demo state between apps', () => {
  it('adopts another app’s state but keeps its own session', async () => {
    const other = createMockApi({ now: () => NOW, latency: 0, autoConfirmAfterSec: null });
    const c = await other.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
    await other.auth.verifyOtp(c.requestId, '1234');
    await other.bookings.cancel('bkg-demo-pest', 'Plans changed');

    api.loadState(other.exportState());
    expect((await api.admin.getBooking('bkg-demo-pest')).status).toBe('cancelled');
    expect((await api.auth.getSession())?.role).toBe('admin');
  });
});

describe('shared translator', () => {
  const translate = createTranslator({
    en: { a: { hello: 'Hello {name}', items: { one: '{count} item', other: '{count} items' } } },
    ar: {
      a: {
        items: {
          one: 'عنصر واحد',
          two: 'عنصران',
          few: '{count} عناصر',
          many: '{count} عنصراً',
          other: '{count} عنصر',
        },
      },
    },
  });
  it('interpolates, pluralises (Arabic categories) and falls back to English', () => {
    expect(translate('en', 'a.hello' as never, { name: 'Noura' })).toBe('Hello Noura');
    expect(translate('ar', 'a.hello' as never, { name: 'نورة' })).toBe('Hello نورة');
    expect(translate('en', 'a.items' as never, { count: 1 })).toBe('1 item');
    expect(translate('ar', 'a.items' as never, { count: 2 })).toBe('عنصران');
    expect(translate('ar', 'a.items' as never, { count: 5 })).toBe('5 عناصر');
    expect(translate('ar', 'a.items' as never, { count: 11 })).toBe('11 عنصراً');
    expect(translate('en', 'missing.key' as never)).toBe('missing.key');
  });
});
