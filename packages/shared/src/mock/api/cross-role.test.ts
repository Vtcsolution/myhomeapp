/**
 * Three apps — customer, professional and admin — each with its own API
 * instance, sharing one demo storage exactly as the web apps do on one
 * origin. Covers the complete booking journey, cross-tab consistency,
 * all-or-nothing writes and repeated actions.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { calculatePrice } from '../../domain/pricing';
import { MINUTE_MS, toMs } from '../../domain/time';
import type { BookingSelections } from '../../types';
import { DEMO_ACCOUNTS } from '../data/people';
import { createDemoSync, type DemoStorage } from '../persistence';
import { createSeedState } from '../seed';
import { createMockApi, type MockApi } from './createMockApi';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
const AC: BookingSelections = { options: { 'ac-type': 'split' }, units: 2, addOnIds: [] };

let clock = NOW;
let storage: DemoStorage & { data: Map<string, string> };

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

/** One "app": an API instance persisted to and refreshed from the shared storage. */
function openApp(): MockApi {
  const sync = createDemoSync(storage);
  const initial = sync.load(clock);
  const api = createMockApi({
    state: initial,
    now: () => clock,
    latency: 0,
    autoConfirmAfterSec: null,
    simulatedReplyAfterSec: null,
    pullExternal: () => sync.pull(),
    onChange: (state) => sync.push(state),
  });
  if (!initial) sync.push(api.exportState());
  return api;
}

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (e) {
    return e instanceof ApiError ? e.code : 'unknown';
  }
}

async function asCustomer(api: MockApi) {
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
  await api.auth.verifyOtp(c.requestId, '1234');
}
async function asTechnician(api: MockApi) {
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.technicianPhone, 'technician');
  await api.auth.verifyOtp(c.requestId, '1234');
}
async function asAdmin(api: MockApi) {
  await api.auth.adminSignIn(DEMO_ACCOUNTS.adminEmail, DEMO_ACCOUNTS.adminPassword);
}

/** A bookable slot at least two days ahead for which the demo professional is offered the job. */
async function slots(customer: MockApi) {
  const out: string[] = [];
  for (const date of await customer.bookings.getBookableDates()) {
    for (const s of await customer.bookings.getAvailableSlots({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      date,
    })) {
      if (s.available && toMs(s.start) > NOW + 2 * 24 * 60 * MINUTE_MS) out.push(s.start);
    }
  }
  return out;
}

beforeEach(() => {
  clock = NOW;
  storage = memoryStorage();
});

describe('customer → professional → admin journey', () => {
  it('runs end to end with every app seeing the same booking', async () => {
    const customer = openApp();
    const pro = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asTechnician(pro);
    await asAdmin(admin);

    // 1–2. Search, options and a quote from the shared pricing engine.
    const found = await customer.catalog.search('تنظيف المكيف');
    const service = found.services.find((s) => s.id === 'svc-ac-cleaning');
    expect(service).toBeDefined();
    const quote = await customer.bookings.getQuote({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
    });
    expect(quote.price).toEqual(calculatePrice({ service: service!, selections: AC }));

    // 3–4. Address, a valid slot, a coupon and simulated checkout.
    const coupon = (await admin.admin.listCoupons()).find((c) => c.code === 'COOL25')!;
    let booking;
    for (const slotStart of await slots(customer)) {
      const created = await customer.bookings.create({
        serviceId: 'svc-ac-cleaning',
        selections: AC,
        addressId: 'adr-01-home',
        slotStart,
        paymentMethod: 'knet',
        couponCode: 'COOL25',
        idempotencyKey: `journey-${slotStart}`,
      });
      if ((await pro.technician.listOffers()).some((o) => o.id === created.id)) {
        booking = created;
        break;
      }
      await customer.bookings.cancel(created.id, 'Test: demo professional not offered');
    }
    expect(booking).toBeDefined();
    expect(booking!.price.couponCode).toBe('COOL25');
    expect(booking!.price.discount).toBeGreaterThan(0);

    // 5. Visible to the customer and to admin.
    expect((await customer.bookings.list('upcoming')).some((b) => b.id === booking!.id)).toBe(true);
    expect((await admin.admin.getBooking(booking!.id)).status).toBe('pending');
    const usedAfter = (await admin.admin.listCoupons()).find((c) => c.id === coupon.id)!.usedCount;

    // 6–7. The professional accepts; admin sees the assignment.
    await pro.technician.acceptOffer(booking!.id);
    const assigned = await admin.admin.getBooking(booking!.id);
    expect(assigned.status).toBe('confirmed');
    expect(assigned.technician?.id).toBe('tec-01');

    // 8–9. Statuses advance on the day; customer and admin follow.
    clock = toMs(booking!.scheduledStart) - 30 * MINUTE_MS;
    expect((await pro.technician.advanceJob(booking!.id)).status).toBe('on_the_way');
    expect((await customer.bookings.get(booking!.id)).status).toBe('on_the_way');
    expect((await pro.technician.advanceJob(booking!.id)).status).toBe('arrived');
    expect((await admin.admin.getBooking(booking!.id)).status).toBe('arrived');

    // 10. Extra charges: one approved, one declined by the customer.
    const withCharges = await pro.technician.addExtraCharge(booking!.id, {
      description: 'Replace drain pipe',
      amount: 4_500,
    });
    const first = withCharges.extraCharges[0]!;
    await customer.bookings.respondToExtraCharge(booking!.id, first.id, true);
    const second = (
      await pro.technician.addExtraCharge(booking!.id, { description: 'Gas top-up', amount: 6_000 })
    ).extraCharges.find((c) => c.id !== first.id)!;
    await customer.bookings.respondToExtraCharge(booking!.id, second.id, false);
    const priced = await admin.admin.getBooking(booking!.id);
    expect(priced.price.total).toBe(booking!.price.total + 4_500);

    // 11. Completion once work has started.
    await pro.technician.advanceJob(booking!.id); // in progress
    clock += 90 * MINUTE_MS;
    expect((await pro.technician.advanceJob(booking!.id)).status).toBe('completed');
    expect((await customer.bookings.get(booking!.id)).status).toBe('completed');

    // 12. Review appears for admin and the professional.
    const review = await customer.bookings.submitReview(booking!.id, {
      rating: 5,
      comment: 'Spotless work, on time.',
    });
    expect(
      (await admin.admin.listReviews({ technicianId: 'tec-01', pageSize: 100 })).items.some(
        (r) => r.id === review.id,
      ),
    ).toBe(true);
    expect((await pro.technician.listReviews()).some((r) => r.id === review.id)).toBe(true);

    // The coupon was counted once for this booking, never again by later steps.
    expect((await admin.admin.listCoupons()).find((c) => c.id === coupon.id)!.usedCount).toBe(
      usedAfter,
    );
  });
});

describe('shared storage between apps', () => {
  it('changes made in different apps without a refresh in between are all kept', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);

    // Admin pauses a coupon; the customer app then saves an address without reloading.
    const coupon = (await admin.admin.listCoupons()).find((c) => c.isActive)!;
    await admin.admin.setCouponActive(coupon.id, false);
    await customer.account.saveAddress({
      label: 'work',
      propertyType: 'office',
      areaId: 'sharq',
      block: '2',
      street: 'Khalid Bin Al-Waleed St',
      building: 'Tower 5',
      contactPhone: '9988 7766',
      location: { lat: 29.38, lng: 47.99 },
    });

    // A freshly opened app sees both changes — neither overwrote the other.
    const fresh = openApp();
    await asAdmin(fresh);
    expect((await fresh.admin.listCoupons()).find((c) => c.id === coupon.id)!.isActive).toBe(false);
    expect(
      (await fresh.admin.getCustomer('cus-01')).addresses.some((a) => a.label === 'work'),
    ).toBe(true);
  });

  it('the customer app sees an admin change on its next call', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);
    const request = {
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      couponCode: 'COOL25',
    };
    expect((await customer.bookings.getQuote(request)).coupon?.status).toBe('applied');
    const cool = (await admin.admin.listCoupons()).find((c) => c.code === 'COOL25')!;
    await admin.admin.setCouponActive(cool.id, false);
    expect((await customer.bookings.getQuote(request)).coupon?.status).toBe('rejected');
  });

  it('each app keeps its own session when adopting another app’s changes', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);
    await admin.admin.setReviewStatus(
      (await admin.admin.listReviews({ pageSize: 1 })).items[0]!.id,
      'hidden',
    );
    expect((await customer.account.getProfile()).id).toBe('cus-01');
    expect((await admin.admin.getProfile()).email).toBe(DEMO_ACCOUNTS.adminEmail);
  });

  it('reset restores a fresh, consistent demo for every app', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);
    await admin.admin.setCouponActive((await admin.admin.listCoupons())[0]!.id, false);
    admin.reset();
    const seed = createSeedState({ now: clock });
    const fresh = openApp();
    await asAdmin(fresh);
    const active = (list: { id: string; isActive: boolean }[]) =>
      Object.fromEntries(list.map((c) => [c.id, c.isActive]));
    expect(active(await fresh.admin.listCoupons())).toEqual(active(seed.coupons));
    expect((await fresh.admin.listBookings({ pageSize: 1 })).total).toBe(seed.bookings.length);
    // The reset signed out the app that ran it; the customer app keeps its session.
    expect(await code(admin.admin.getDashboard())).toBe('UNAUTHORIZED');
    expect((await customer.account.getProfile()).id).toBe('cus-01');
  });
});

describe('failed and repeated operations', () => {
  it('a rejected write leaves no partial change behind', async () => {
    const customer = openApp();
    await asCustomer(customer);
    const before = await customer.account.getProfile();
    expect(
      await code(
        customer.account.updateProfile({ fullName: 'Changed Name', email: 'not-an-email' }),
      ),
    ).toBe('VALIDATION');
    expect((await customer.account.getProfile()).fullName).toBe(before.fullName);
    // Nor in what another app reads from storage.
    const fresh = openApp();
    await asAdmin(fresh);
    expect((await fresh.admin.getCustomer('cus-01')).fullName).toBe(before.fullName);
  });

  it('a wrong sign-in code still counts towards the attempt limit', async () => {
    const api = openApp();
    const request = await api.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
    for (let i = 0; i < 5; i++) await code(api.auth.verifyOtp(request.requestId, '0000'));
    expect(await code(api.auth.verifyOtp(request.requestId, '1234'))).toBe('OTP_EXPIRED');
  });

  it('repeating a checkout (double tap or reload) creates one booking and uses the coupon once', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);
    const [slotStart] = await slots(customer);
    const before = (await admin.admin.listCoupons()).find((c) => c.code === 'COOL25')!.usedCount;
    const request = {
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slotStart!,
      paymentMethod: 'knet' as const,
      couponCode: 'COOL25',
      idempotencyKey: 'same-attempt',
    };
    const [a, b] = await Promise.all([
      customer.bookings.create(request),
      customer.bookings.create(request),
    ]);
    // After a reload the app is a new instance, retrying with the stored key.
    const reloaded = openApp();
    await asCustomer(reloaded);
    const c = await reloaded.bookings.create(request);
    expect(new Set([a.id, b.id, c.id]).size).toBe(1);
    expect((await admin.admin.listCoupons()).find((x) => x.code === 'COOL25')!.usedCount).toBe(
      before + 1,
    );
  });

  it('a second assignment of the same professional to an overlapping booking is refused', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);
    const [slotStart] = await slots(customer);
    const base = {
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      addressId: 'adr-01-home',
      slotStart: slotStart!,
      paymentMethod: 'cash' as const,
    };
    const one = await customer.bookings.create({ ...base, idempotencyKey: 'one' });
    const two = await customer.bookings.create({ ...base, idempotencyKey: 'two' });
    const eligible = (await admin.admin.listEligibleTechnicians(one.id)).find((e) => e.isFree)!;
    await admin.admin.assignTechnician(one.id, eligible.technician.id);
    expect(await code(admin.admin.assignTechnician(two.id, eligible.technician.id))).toBe(
      'CONFLICT',
    );
    expect((await admin.admin.getBooking(two.id)).technician).toBeNull();
  });
});

describe('long-running demo', () => {
  it('apps keep sharing changes after the demo data is older than the re-seed age', async () => {
    const customer = openApp();
    const admin = openApp();
    await asCustomer(customer);
    await asAdmin(admin);
    clock = NOW + 13 * 60 * MINUTE_MS;
    const cool = (await admin.admin.listCoupons()).find((c) => c.code === 'COOL25')!;
    await admin.admin.setCouponActive(cool.id, false);
    const quote = await customer.bookings.getQuote({
      serviceId: 'svc-ac-cleaning',
      selections: AC,
      couponCode: 'COOL25',
    });
    expect(quote.coupon?.status).toBe('rejected');
  });
});

describe('company approval and suspension', () => {
  it('a suspended company’s professionals get no jobs and cannot go online until reactivated', async () => {
    const admin = openApp();
    const pro = openApp();
    await asAdmin(admin);

    // A pending booking that a company professional is eligible for.
    let target: { bookingId: string; technicianId: string; vendorId: string } | undefined;
    for (const b of (await admin.admin.listBookings({ status: ['pending'], pageSize: 100 }))
      .items) {
      for (const e of await admin.admin.listEligibleTechnicians(b.id)) {
        const t = await admin.admin.getTechnician(e.technician.id);
        if (t.vendorId) target = { bookingId: b.id, technicianId: t.id, vendorId: t.vendorId };
        if (target) break;
      }
      if (target) break;
    }
    expect(target).toBeDefined();
    const { bookingId, technicianId, vendorId } = target!;
    const phone = (await admin.admin.getTechnician(technicianId)).phone;
    const c = await pro.auth.requestOtp(phone, 'technician');
    await pro.auth.verifyOtp(c.requestId, '1234');

    await admin.admin.setVendorStatus(vendorId, 'suspended');
    const eligible = await admin.admin.listEligibleTechnicians(bookingId);
    expect(eligible.some((e) => e.technician.id === technicianId)).toBe(false);
    expect(await code(admin.admin.assignTechnician(bookingId, technicianId))).not.toBe('ok');
    expect(await code(pro.technician.setOnline(true))).toBe('FORBIDDEN');
    expect(await code(pro.technician.acceptOffer(bookingId))).toBe('FORBIDDEN');
    expect((await pro.technician.listOffers()).length).toBe(0);

    await admin.admin.setVendorStatus(vendorId, 'active');
    expect(
      (await admin.admin.listEligibleTechnicians(bookingId)).some(
        (e) => e.technician.id === technicianId,
      ),
    ).toBe(true);
    expect((await pro.technician.setOnline(true)).isOnline).toBe(true);
  });

  it('a new company starts pending and its details are validated', async () => {
    const admin = openApp();
    await asAdmin(admin);
    const input = {
      name: { en: 'Gulf Shine', ar: 'لمعة الخليج' },
      legalName: 'Gulf Shine General Trading Co.',
      crNumber: 'CR-445566',
      contactName: 'Fahad Al-Mutairi',
      phone: '5123 4567',
      email: 'ops@gulfshine.demo',
      categoryIds: ['cat-cleaning'],
      governorateIds: ['hawalli' as const],
      commissionRate: 0.12,
    };
    expect(await code(admin.admin.createVendor({ ...input, crNumber: '123' }))).toBe('VALIDATION');
    const vendor = await admin.admin.createVendor(input);
    expect(vendor.status).toBe('pending_approval');
    expect((await admin.admin.setVendorStatus(vendor.id, 'active')).status).toBe('active');
  });

  it('a stored session is restored on reload and rejected once signed out', async () => {
    const first = openApp();
    await asCustomer(first);
    const session = (await first.account.getProfile()) && first.exportState().session!;
    const reloaded = openApp();
    await reloaded.auth.restoreSession(session);
    expect((await reloaded.account.getProfile()).id).toBe('cus-01');
    clock = Date.parse(session.expiresAt) + 1;
    expect(await code(openApp().auth.restoreSession(session))).toBe('UNAUTHORIZED');
  });
});
