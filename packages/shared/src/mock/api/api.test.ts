import { beforeEach, describe, expect, it } from 'vitest';
import type { MyHomeApi } from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { kuwaitLocalToISO, MINUTE_MS, toMs } from '../../domain/time';
import type { BookingSelections } from '../../types';
import { DEMO_ACCOUNTS } from '../data/people';
import type { MockState } from '../state';
import { createMockApi, type MockApi, type MockApiOptions } from './createMockApi';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
const AC_SELECTIONS: BookingSelections = {
  options: { 'ac-type': 'split' },
  units: 2,
  addOnIds: [],
};

let clock = NOW;
let api: MockApi;

function makeApi(options: MockApiOptions = {}) {
  return createMockApi({ now: () => clock, latency: 0, autoConfirmAfterSec: null, ...options });
}

async function expectApiError(promise: Promise<unknown>, code: ApiError['code']) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).code).toBe(code);
}

async function signInCustomer(target: MyHomeApi, phone: string = DEMO_ACCOUNTS.customerPhone) {
  const challenge = await target.auth.requestOtp(phone, 'customer');
  return target.auth.verifyOtp(challenge.requestId, '1234');
}

async function signInTechnician(target: MyHomeApi, phone: string) {
  await target.auth.signOut();
  const challenge = await target.auth.requestOtp(phone, 'technician');
  return target.auth.verifyOtp(challenge.requestId, '1234');
}

async function signInAdmin(target: MyHomeApi) {
  await target.auth.signOut();
  return target.auth.adminSignIn(DEMO_ACCOUNTS.adminEmail, DEMO_ACCOUNTS.adminPassword);
}

/** First available slot for a service at the customer's default address. */
async function firstSlot(
  target: MyHomeApi,
  serviceId: string,
  selections: BookingSelections,
  minStartMs = 0,
) {
  const profile = await target.account.getProfile();
  const address = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0];
  if (!address) throw new Error('no address');
  for (const date of await target.bookings.getBookableDates()) {
    const slots = await target.bookings.getAvailableSlots({
      serviceId,
      selections,
      addressId: address.id,
      date,
    });
    const slot = slots.find((s) => s.available && toMs(s.start) >= minStartMs);
    if (slot) return { slot, addressId: address.id };
  }
  throw new Error('no slot available');
}

async function phoneOf(technicianId: string) {
  const state = api.exportState();
  const t = state.technicians.find((x) => x.id === technicianId);
  if (!t) throw new Error(technicianId);
  return t.phone;
}

beforeEach(() => {
  clock = NOW;
  api = makeApi();
});

describe('authentication', () => {
  it('signs a known customer in with the simulated OTP', async () => {
    await expectApiError(api.auth.requestOtp('123', 'customer'), 'VALIDATION');
    const challenge = await api.auth.requestOtp('5555 0101', 'customer');
    expect(challenge.phone).toBe('+96555550101');
    expect(challenge.demoCode).toBe('1234');
    await expectApiError(api.auth.verifyOtp(challenge.requestId, '0000'), 'OTP_INVALID');
    const session = await api.auth.verifyOtp(challenge.requestId, '1234');
    expect(session).toMatchObject({ role: 'customer', userId: 'cus-01', isNewUser: false });
    await expectApiError(api.auth.verifyOtp(challenge.requestId, '1234'), 'OTP_EXPIRED');
    expect(await api.auth.getSession()).toMatchObject({ userId: 'cus-01' });
  });

  it('expires codes after five minutes', async () => {
    const challenge = await api.auth.requestOtp('55550101', 'customer');
    clock += 6 * MINUTE_MS;
    await expectApiError(api.auth.verifyOtp(challenge.requestId, '1234'), 'OTP_EXPIRED');
  });

  it('creates new customers and requires a profile before booking', async () => {
    const session = await signInCustomer(api, '99001122');
    expect(session.isNewUser).toBe(true);
    await expectApiError(
      api.bookings.create({
        serviceId: 'svc-ac-cleaning',
        selections: AC_SELECTIONS,
        addressId: 'x',
        slotStart: new Date(NOW).toISOString(),
        paymentMethod: 'cash',
      }),
      'VALIDATION',
    );
    const profile = await api.account.updateProfile({ fullName: 'Sara Test' });
    expect(profile.fullName).toBe('Sara Test');
    expect((await api.auth.getSession())?.isNewUser).toBe(false);
  });

  it('rejects unregistered technicians and blocked customers', async () => {
    await expectApiError(api.auth.requestOtp('99001122', 'technician'), 'NOT_REGISTERED');
    await expectApiError(api.auth.requestOtp('55550114', 'customer'), 'ACCOUNT_BLOCKED');
  });

  it('authenticates admins and enforces roles', async () => {
    await expectApiError(api.admin.getDashboard(), 'UNAUTHORIZED');
    await expectApiError(api.auth.adminSignIn('admin@myhome.demo', 'wrong'), 'UNAUTHORIZED');
    await signInCustomer(api);
    await expectApiError(api.admin.getDashboard(), 'FORBIDDEN');
    await expectApiError(api.technician.getDashboard(), 'FORBIDDEN');
    const session = await signInAdmin(api);
    expect(session.role).toBe('admin');
    const profile = await api.admin.getProfile();
    expect(profile).not.toHaveProperty('password');
  });
});

describe('catalog', () => {
  it('lists categories in order and searches in both languages', async () => {
    const categories = await api.catalog.listCategories();
    expect(categories.map((c) => c.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const arabic = await api.catalog.search('تكييف');
    expect(arabic.services[0]?.categoryId).toBe('cat-ac');
    expect(arabic.categories.map((c) => c.id)).toContain('cat-ac');
    const english = await api.catalog.search('deep clean');
    expect(english.services[0]?.id).toBe('svc-cleaning-deep');
  });

  it('returns only published reviews and active technicians', async () => {
    const reviews = await api.catalog.listServiceReviews('svc-ac-cleaning', 50);
    expect(reviews.every((r) => r.status === 'published')).toBe(true);
    expect(reviews[0]?.customerDisplayName).toMatch(/^\S+ [A-Z]\.$|^\S+$/);
    await expectApiError(api.catalog.getTechnician('tec-17'), 'NOT_FOUND');
  });

  it('returns detached copies', async () => {
    const service = await api.catalog.getService('svc-ac-cleaning');
    service.basePrice = 1;
    expect((await api.catalog.getService('svc-ac-cleaning')).basePrice).toBe(8_000);
  });
});

describe('customer booking → technician → review', () => {
  it('runs the complete happy path', async () => {
    await signInCustomer(api);

    const quote = await api.bookings.getQuote({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      couponCode: 'cool25',
    });
    expect(quote.coupon).toMatchObject({ status: 'applied', discount: 4_000 });
    expect(quote.price.total).toBe(12_000);
    const bogus = await api.bookings.getQuote({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      couponCode: 'NOPE',
    });
    expect(bogus.coupon).toMatchObject({ status: 'rejected', reason: 'not_found' });

    const { slot, addressId } = await firstSlot(
      api,
      'svc-ac-cleaning',
      AC_SELECTIONS,
      NOW + 24 * 60 * MINUTE_MS,
    );
    const usedBefore = api.exportState().coupons.find((c) => c.code === 'COOL25')?.usedCount ?? 0;
    const booking = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      addressId,
      slotStart: slot.start,
      paymentMethod: 'knet',
      couponCode: 'COOL25',
      notes: 'Gate code 1234',
    });
    expect(booking.status).toBe('pending');
    expect(booking.payment).toMatchObject({ status: 'paid', paidAmount: 12_000 });
    expect(booking.payment.reference).toMatch(/^SIM-/);
    expect(booking.offeredTo.length).toBeGreaterThan(0);
    expect(api.exportState().coupons.find((c) => c.code === 'COOL25')?.usedCount).toBe(
      usedBefore + 1,
    );
    expect((await api.bookings.list('upcoming')).map((b) => b.id)).toContain(booking.id);

    // The same slot cannot be booked twice if it was the last free technician.
    const technicianId = booking.offeredTo[0] as string;
    await signInTechnician(api, await phoneOf(technicianId));
    const offers = await api.technician.listOffers();
    expect(offers.map((o) => o.id)).toContain(booking.id);
    const accepted = await api.technician.acceptOffer(booking.id);
    expect(accepted.status).toBe('confirmed');
    expect(accepted.chatThreadId).not.toBeNull();

    if (toMs(slot.start) > NOW + 24 * 60 * MINUTE_MS) {
      await expectApiError(api.technician.advanceJob(booking.id), 'CONFLICT');
    }
    clock = toMs(slot.start) - 10 * MINUTE_MS;
    expect((await api.technician.advanceJob(booking.id)).status).toBe('on_the_way');

    await api.auth.signOut();
    await signInCustomer(api);
    clock += 5 * MINUTE_MS;
    const tracking = await api.bookings.getTracking(booking.id);
    expect(tracking.technicianLocation).not.toBeNull();
    expect(tracking.etaMinutes).toBeGreaterThan(0);

    await signInTechnician(api, await phoneOf(technicianId));
    expect((await api.technician.advanceJob(booking.id)).status).toBe('arrived');
    const withExtra = await api.technician.addExtraCharge(booking.id, {
      description: 'Replace drain hose',
      amount: 5_000,
    });
    expect(withExtra.extraCharges[0]?.status).toBe('pending_approval');
    expect((await api.technician.advanceJob(booking.id)).status).toBe('in_progress');
    await expectApiError(api.technician.advanceJob(booking.id), 'CONFLICT');

    await api.auth.signOut();
    await signInCustomer(api);
    const chargeId = withExtra.extraCharges[0]?.id as string;
    const approved = await api.bookings.respondToExtraCharge(booking.id, chargeId, true);
    expect(approved.price.total).toBe(17_000);
    expect(approved.balanceDue).toBe(5_000);
    await expectApiError(api.bookings.respondToExtraCharge(booking.id, chargeId, true), 'CONFLICT');

    await signInTechnician(api, await phoneOf(technicianId));
    const completed = await api.technician.advanceJob(booking.id);
    expect(completed.status).toBe('completed');
    expect(completed.balanceDue).toBe(0);
    expect(completed.payment.paidAmount).toBe(17_000);

    await api.auth.signOut();
    await signInCustomer(api);
    const notifications = await api.notifications.list();
    expect(notifications[0]?.title.en).toBe('Service completed');
    const review = await api.bookings.submitReview(booking.id, { rating: 5, comment: 'شغل ممتاز' });
    expect(review.language).toBe('ar');
    await expectApiError(
      api.bookings.submitReview(booking.id, { rating: 4, comment: '' }),
      'CONFLICT',
    );
    const reviewed = api.exportState().technicians.find((t) => t.id === technicianId);
    const published = api
      .exportState()
      .reviews.filter((r) => r.technicianId === technicianId && r.status === 'published');
    expect(reviewed?.reviewsCount).toBe(published.length);
  });

  it('automatically confirms new bookings when the simulation is enabled', async () => {
    api = makeApi({ autoConfirmAfterSec: 20 });
    await signInCustomer(api);
    const { slot, addressId } = await firstSlot(api, 'svc-ac-cleaning', AC_SELECTIONS);
    const booking = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      addressId,
      slotStart: slot.start,
      paymentMethod: 'cash',
    });
    expect((await api.bookings.get(booking.id)).status).toBe('pending');
    clock += 25_000;
    // The demo professional (tec-01) gets time to accept by hand when offered the job.
    const demoOffered = booking.offeredTo.includes('tec-01');
    expect((await api.bookings.get(booking.id)).status).toBe(demoOffered ? 'pending' : 'confirmed');
    clock += 160_000;
    const confirmed = await api.bookings.get(booking.id);
    expect(confirmed.status).toBe('confirmed');
    expect(booking.offeredTo).toContain(confirmed.technicianId);
  });

  it('rejects unavailable slots', async () => {
    await signInCustomer(api);
    await expectApiError(
      api.bookings.create({
        serviceId: 'svc-ac-cleaning',
        selections: AC_SELECTIONS,
        addressId: 'adr-01-home',
        slotStart: kuwaitLocalToISO('2026-10-19', '08:00'),
        paymentMethod: 'cash',
      }),
      'SLOT_UNAVAILABLE',
    );
  });
});

describe('cancellation, refunds and rescheduling', () => {
  it('refunds wallet payments in full when cancelled early', async () => {
    await signInCustomer(api);
    const before = (await api.account.getWallet()).balance;
    const selections: BookingSelections = { options: { cleaners: 'one' }, units: 2, addOnIds: [] };
    const { slot, addressId } = await firstSlot(
      api,
      'svc-cleaning-regular',
      selections,
      NOW + 24 * 60 * MINUTE_MS,
    );
    const booking = await api.bookings.create({
      serviceId: 'svc-cleaning-regular',
      selections,
      addressId,
      slotStart: slot.start,
      paymentMethod: 'wallet',
    });
    expect((await api.account.getWallet()).balance).toBe(before - booking.price.total);
    expect(booking.cancellationFee).toBe(0);
    const cancelled = await api.bookings.cancel(booking.id, 'Plans changed');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.payment.status).toBe('refunded');
    expect((await api.account.getWallet()).balance).toBe(before);
    await expectApiError(api.bookings.cancel(booking.id, 'again'), 'CONFLICT');
  });

  it('charges the late-cancellation fee close to the visit', async () => {
    await signInCustomer(api);
    const { slot, addressId } = await firstSlot(api, 'svc-ac-cleaning', AC_SELECTIONS);
    const booking = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      addressId,
      slotStart: slot.start,
      paymentMethod: 'card',
    });
    clock = toMs(slot.start) - 60 * MINUTE_MS;
    const view = await api.bookings.get(booking.id);
    expect(view.canReschedule).toBe(false);
    expect(view.cancellationFee).toBe(2_000);
    const cancelled = await api.bookings.cancel(booking.id, 'Running late');
    expect(cancelled.cancellation).toMatchObject({
      fee: 2_000,
      refundAmount: booking.price.total - 2_000,
    });
    expect(cancelled.payment.status).toBe('partially_refunded');
  });

  it('rejects wallet payments without enough balance', async () => {
    await signInCustomer(api);
    const selections: BookingSelections = {
      options: { 'paint-grade': 'designer' },
      units: 6,
      addOnIds: [],
    };
    const { slot, addressId } = await firstSlot(api, 'svc-painting-room', selections);
    await expectApiError(
      api.bookings.create({
        serviceId: 'svc-painting-room',
        selections,
        addressId,
        slotStart: slot.start,
        paymentMethod: 'wallet',
      }),
      'INSUFFICIENT_FUNDS',
    );
  });

  it('reschedules to another available slot', async () => {
    await signInCustomer(api);
    const { slot, addressId } = await firstSlot(
      api,
      'svc-ac-cleaning',
      AC_SELECTIONS,
      NOW + 24 * 60 * MINUTE_MS,
    );
    const booking = await api.bookings.create({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      addressId,
      slotStart: slot.start,
      paymentMethod: 'cash',
    });
    const dates = await api.bookings.getBookableDates();
    let target: string | undefined;
    for (const date of dates.slice(3)) {
      target = (await api.bookings.getRescheduleSlots(booking.id, date)).find(
        (s) => s.available,
      )?.start;
      if (target) break;
    }
    if (!target) throw new Error('no reschedule slot');
    const moved = await api.bookings.reschedule(booking.id, target);
    expect(moved.scheduledStart).toBe(target);
    expect(moved.timeline.at(-1)?.type).toBe('rescheduled');
  });
});

describe('account, chat and support', () => {
  it('manages addresses with a single default', async () => {
    await signInCustomer(api);
    const added = await api.account.saveAddress({
      label: 'work',
      propertyType: 'office',
      areaId: 'sharq',
      block: '2',
      street: 'Khalid Bin Al-Waleed St',
      building: 'Tower 5',
      floor: '18',
      location: { lat: 29.38, lng: 47.99 },
      isDefault: true,
    });
    const profile = await api.account.getProfile();
    expect(profile.addresses.filter((a) => a.isDefault).map((a) => a.id)).toEqual([added.id]);
    await expectApiError(
      api.account.saveAddress({ ...added, id: undefined, block: ' ' }),
      'VALIDATION',
    );
    await api.account.deleteAddress(added.id);
    expect((await api.account.getProfile()).addresses.filter((a) => a.isDefault)).toHaveLength(1);
  });

  it('tops up the wallet (simulated)', async () => {
    await signInCustomer(api);
    const wallet = await api.account.topUpWallet(20_000, 'knet');
    expect(wallet.balance).toBe(32_750);
    await expectApiError(api.account.topUpWallet(10, 'knet'), 'VALIDATION');
  });

  it('exchanges chat messages between customer and technician', async () => {
    await signInCustomer(api);
    const threads = await api.chat.listThreads();
    const live = threads.find((t) => t.bookingId === 'bkg-demo-live');
    if (!live) throw new Error('missing live thread');
    expect(live.counterpartName.en).toBe('Rajesh Kumar');
    await api.chat.markRead(live.id);
    await api.chat.sendMessage(live.id, 'I am at home.');
    await expectApiError(api.chat.sendMessage(live.id, '   '), 'VALIDATION');

    await signInTechnician(api, DEMO_ACCOUNTS.technicianPhone);
    const techThread = await api.chat.getThread(live.id);
    expect(techThread.unread).toBe(1);
    const messages = await api.chat.getMessages(live.id);
    expect(messages.at(-1)).toMatchObject({ sender: 'customer', text: 'I am at home.' });
    await api.chat.markRead(live.id);
    expect((await api.chat.getThread(live.id)).unread).toBe(0);
  });

  it('routes support tickets to admins and back', async () => {
    await signInCustomer(api);
    const ticket = await api.support.createTicket({
      subject: 'Invoice request',
      category: 'payment',
      message: 'Please send an invoice.',
    });
    expect(ticket.status).toBe('open');
    await signInAdmin(api);
    const replied = await api.admin.replyToTicket(ticket.id, 'Sent to your email.');
    expect(replied.status).toBe('in_progress');
    expect(replied.requesterName).toBe('Noura Al-Kandari');
    await api.auth.signOut();
    await signInCustomer(api);
    expect((await api.notifications.list())[0]?.title.en).toBe('Support replied');
    expect(await api.notifications.unreadCount()).toBeGreaterThan(0);
    await api.notifications.markAllRead();
    expect(await api.notifications.unreadCount()).toBe(0);
  });
});

describe('technician', () => {
  it('shows the demo technician a realistic dashboard', async () => {
    await signInTechnician(api, DEMO_ACCOUNTS.technicianPhone);
    const dashboard = await api.technician.getDashboard();
    expect(dashboard.nextJob?.id).toBe('bkg-demo-live');
    expect(dashboard.pendingOffers).toBeGreaterThanOrEqual(2);
    expect(dashboard.rating).toBeGreaterThan(0);
    const earnings = await api.technician.getEarnings('month');
    expect(earnings.series).toHaveLength(30);
    expect(earnings.net).toBe(earnings.series.reduce((s, d) => s + d.net, 0));
    expect(earnings.paidBy).toBe('platform');
    expect(earnings.payouts.length).toBeGreaterThan(0);
  });

  it('declines offers and re-dispatches the job', async () => {
    await signInTechnician(api, DEMO_ACCOUNTS.technicianPhone);
    const [offer] = await api.technician.listOffers();
    if (!offer) throw new Error('no offer');
    await api.technician.declineOffer(offer.id);
    expect((await api.technician.listOffers()).map((o) => o.id)).not.toContain(offer.id);
    await expectApiError(api.technician.acceptOffer(offer.id), 'CONFLICT');
  });

  it('validates availability changes', async () => {
    await signInTechnician(api, DEMO_ACCOUNTS.technicianPhone);
    const availability = await api.technician.getAvailability();
    await expectApiError(
      api.technician.updateAvailability({
        ...availability,
        weekly: { ...availability.weekly, 1: { start: '18:00', end: '09:00' } },
      }),
      'VALIDATION',
    );
    const updated = await api.technician.updateAvailability({
      ...availability,
      daysOff: ['2026-10-25', '2026-10-25'],
    });
    expect(updated.daysOff).toEqual(['2026-10-25']);
  });

  it('keeps unapproved technicians offline', async () => {
    await signInTechnician(api, '60001017');
    await expectApiError(api.technician.setOnline(true), 'FORBIDDEN');
  });
});

describe('admin', () => {
  beforeEach(async () => {
    await signInAdmin(api);
  });

  it('computes a consistent dashboard', async () => {
    const dashboard = await api.admin.getDashboard();
    const total = api.exportState().bookings.length;
    expect(Object.values(dashboard.byStatus).reduce((s, n) => s + n, 0)).toBe(total);
    expect(dashboard.revenueSeries).toHaveLength(30);
    expect(dashboard.kpis.revenueMonth).toBeGreaterThan(0);
    expect(dashboard.kpis.pendingApprovals).toBe(2);
    expect(dashboard.kpis.completionRate + dashboard.kpis.cancellationRate).toBeCloseTo(1);
    expect(dashboard.topTechnicians.length).toBeGreaterThan(0);
  });

  it('filters, searches and paginates bookings', async () => {
    const pending = await api.admin.listBookings({ status: ['pending'], pageSize: 5 });
    expect(pending.items.every((b) => b.status === 'pending')).toBe(true);
    expect(pending.items.length).toBeLessThanOrEqual(5);
    const live = api.exportState().bookings.find((b) => b.id === 'bkg-demo-live');
    const byRef = await api.admin.listBookings({ search: live?.reference });
    expect(byRef.items[0]?.id).toBe('bkg-demo-live');
    const page2 = await api.admin.listBookings({ page: 2, pageSize: 10 });
    expect(page2.page).toBe(2);
    expect(page2.total).toBe(api.exportState().bookings.length);
  });

  it('assigns a free technician to a pending booking', async () => {
    const booking = api.exportState().bookings.find((b) => b.id === 'bkg-demo-deep');
    if (!booking) throw new Error('missing');
    const eligible = await api.admin.listEligibleTechnicians(booking.id);
    const free = eligible.find((e) => e.isFree);
    if (!free) throw new Error('no free technician');
    const assigned = await api.admin.assignTechnician(booking.id, free.technician.id);
    expect(assigned.status).toBe('confirmed');
    expect(assigned.technician?.id).toBe(free.technician.id);
    await expectApiError(api.admin.assignTechnician(booking.id, 'tec-12'), 'VALIDATION');
  });

  it('approves technicians only after their documents are verified', async () => {
    await expectApiError(api.admin.setTechnicianStatus('tec-17', 'active'), 'VALIDATION');
    const technician = await api.admin.getTechnician('tec-17');
    for (const doc of technician.documents) {
      await api.admin.reviewTechnicianDocument('tec-17', doc.id, 'verified');
    }
    expect((await api.admin.setTechnicianStatus('tec-17', 'active')).status).toBe('active');
  });

  it('blocks customers', async () => {
    await api.admin.setCustomerStatus('cus-02', 'blocked');
    await api.auth.signOut();
    await expectApiError(api.auth.requestOtp('55550102', 'customer'), 'ACCOUNT_BLOCKED');
  });

  it('creates vendors with validation', async () => {
    const input = {
      name: { en: 'Falcon Cooling', ar: 'الصقر للتبريد' },
      legalName: 'Falcon Cooling Co.',
      crNumber: 'CR-555123',
      contactName: 'Saud',
      phone: '22001122',
      email: 'ops@falcon.demo',
      categoryIds: ['cat-ac'],
      governorateIds: ['capital' as const],
      commissionRate: 0.12,
    };
    await expectApiError(api.admin.createVendor({ ...input, crNumber: '123' }), 'VALIDATION');
    const vendor = await api.admin.createVendor(input);
    expect(vendor).toMatchObject({
      status: 'pending_approval',
      phone: '+96522001122',
      techniciansCount: 0,
    });
  });

  it('manages coupons that customers can then use', async () => {
    const base = api.exportState().coupons.find((c) => c.code === 'COOL25');
    if (!base) throw new Error('missing');
    const { id: _id, usedCount: _used, ...rest } = base;
    await expectApiError(api.admin.saveCoupon({ ...rest }), 'VALIDATION');
    const created = await api.admin.saveCoupon({
      ...rest,
      code: 'staff20',
      type: 'percent',
      value: 20,
      categoryIds: [],
    });
    expect(created.code).toBe('STAFF20');
    await api.auth.signOut();
    await signInCustomer(api);
    const quote = await api.bookings.getQuote({
      serviceId: 'svc-ac-cleaning',
      selections: AC_SELECTIONS,
      couponCode: 'STAFF20',
    });
    expect(quote.coupon?.status).toBe('applied');
  });

  it('moderates reviews and recomputes ratings', async () => {
    const page = await api.admin.listReviews({ status: 'published', pageSize: 1 });
    const review = page.items[0];
    if (!review) throw new Error('no review');
    const before =
      api.exportState().technicians.find((t) => t.id === review.technicianId)?.reviewsCount ?? 0;
    await api.admin.setReviewStatus(review.id, 'hidden');
    expect(
      api.exportState().technicians.find((t) => t.id === review.technicianId)?.reviewsCount,
    ).toBe(before - 1);
  });

  it('pays out closed periods only', async () => {
    const processing = (await api.admin.listPayouts({ status: 'processing' }))[0];
    const scheduled = (await api.admin.listPayouts({ status: 'scheduled' }))[0];
    if (!processing || !scheduled) throw new Error('missing payouts');
    expect((await api.admin.markPayoutPaid(processing.id)).status).toBe('paid');
    await expectApiError(api.admin.markPayoutPaid(scheduled.id), 'CONFLICT');
  });

  it('cancels bookings with a full refund', async () => {
    const booking = api.exportState().bookings.find((b) => b.id === 'bkg-demo-pest');
    const cancelled = await api.admin.updateBookingStatus(
      'bkg-demo-pest',
      'cancelled',
      'Customer request by phone',
    );
    expect(cancelled.cancellation).toMatchObject({
      by: 'admin',
      fee: 0,
      refundAmount: booking?.payment.paidAmount,
    });
    await expectApiError(api.admin.updateBookingStatus('bkg-demo-pest', 'completed'), 'CONFLICT');
  });
});

describe('persistence and runtime behaviour', () => {
  it('reports changes and restores exported state', async () => {
    let saved: MockState | null = null;
    let writes = 0;
    api = makeApi({
      onChange: (s) => {
        saved = s;
        writes += 1;
      },
    });
    await api.catalog.listCategories();
    expect(writes).toBe(0);
    await signInCustomer(api);
    expect(writes).toBeGreaterThan(0);
    expect(saved).not.toBeNull();

    const restored = makeApi({ state: api.exportState() });
    expect((await restored.auth.getSession())?.userId).toBe('cus-01');
    expect((await restored.bookings.list()).length).toBe((await api.bookings.list()).length);
  });

  it('simulates network latency', async () => {
    api = makeApi({ latency: 40 });
    const started = Date.now();
    await api.catalog.listCategories();
    expect(Date.now() - started).toBeGreaterThanOrEqual(30);
  });

  it('can reset the demo', async () => {
    await signInCustomer(api);
    api.reset();
    expect(await api.auth.getSession()).toBeNull();
  });
});
