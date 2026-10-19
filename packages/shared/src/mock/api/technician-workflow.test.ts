/**
 * The professional's workflow as served by the simulated API, and how each
 * step reaches the customer: acceptance, conflicts, status changes, notes and
 * photos, availability, earnings, reviews and documents.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { addDaysToLocalDate, kuwaitDateOf, weekdayOfLocalDate } from '../../domain/time';
import type { MockState } from '../state';
import { DEMO_ACCOUNTS } from '../data/people';
import { createMockApi, type MockApi } from './createMockApi';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
const LIVE = 'bkg-demo-live'; // Noura's AC cleaning, Rajesh is on the way
const RAJESH = 'tec-01';

let clock = NOW;
let api: MockApi;

function makeApi(state?: MockState) {
  return createMockApi({
    now: () => clock,
    latency: 0,
    autoConfirmAfterSec: null,
    simulatedReplyAfterSec: null,
    ...(state ? { state } : {}),
  });
}

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (e) {
    return e instanceof ApiError ? e.code : 'unknown';
  }
}

async function asCustomer() {
  await api.auth.signOut();
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
  await api.auth.verifyOtp(c.requestId, '1234');
}

async function asTechnician() {
  await api.auth.signOut();
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.technicianPhone, 'technician');
  await api.auth.verifyOtp(c.requestId, '1234');
}

beforeEach(async () => {
  clock = NOW;
  api = makeApi();
  await asTechnician();
});

describe('job requests', () => {
  it('offers a new customer booking to the demo professional when eligible', async () => {
    await asCustomer();
    const selections = { options: { 'ac-type': 'split' }, units: 1, addOnIds: [] };
    let created;
    for (const date of await api.bookings.getBookableDates()) {
      const slot = (
        await api.bookings.getAvailableSlots({
          serviceId: 'svc-ac-cleaning',
          selections,
          addressId: 'adr-01-home',
          date,
        })
      ).find((s) => s.available && Date.parse(s.start) > NOW + 24 * 3_600_000);
      if (slot) {
        created = await api.bookings.create({
          serviceId: 'svc-ac-cleaning',
          selections,
          addressId: 'adr-01-home',
          slotStart: slot.start,
          paymentMethod: 'cash',
        });
        break;
      }
    }
    expect(created?.offeredTo).toContain(RAJESH);
    expect(created!.offeredTo.length).toBeLessThanOrEqual(3);
    await asTechnician();
    expect((await api.technician.listOffers()).map((o) => o.id)).toContain(created!.id);
  });

  it('shows what each request pays and accepting assigns the professional for the customer', async () => {
    const [offer] = await api.technician.listOffers();
    expect(offer).toBeDefined();
    expect(offer!.technicianNet + offer!.commission).toBe(offer!.price.total);
    expect(offer!.commission).toBe(Math.round(offer!.price.total * 0.15));

    const accepted = await api.technician.acceptOffer(offer!.id);
    expect(accepted.status).toBe('confirmed');
    expect(accepted.technician?.id).toBe(RAJESH);
    expect((await api.technician.listOffers()).map((o) => o.id)).not.toContain(offer!.id);
    expect((await api.technician.listJobs('upcoming')).map((j) => j.id)).toContain(offer!.id);

    // The customer of that booking sees the assignment and is told about it.
    const state = api.exportState();
    const customer = state.customers.find((c) => c.id === accepted.customer.id)!;
    expect(
      state.notifications.some(
        (n) =>
          n.recipientId === customer.id &&
          n.bookingId === offer!.id &&
          n.title.en === 'Booking confirmed',
      ),
    ).toBe(true);
    expect(state.chatThreads.some((t) => t.bookingId === offer!.id)).toBe(true);
  });

  it('declining removes the request and it cannot be accepted afterwards', async () => {
    const [offer] = await api.technician.listOffers();
    await api.technician.declineOffer(offer!.id);
    expect((await api.technician.listOffers()).map((o) => o.id)).not.toContain(offer!.id);
    expect(await code(api.technician.acceptOffer(offer!.id))).toBe('CONFLICT');
  });

  it('never offers or accepts a job that overlaps an accepted one', async () => {
    const state = api.exportState();
    const committed = state.bookings.find(
      (b) => b.technicianId === RAJESH && b.status === 'confirmed',
    )!;
    const offer = state.bookings.find(
      (b) => b.status === 'pending' && b.offeredTo.includes(RAJESH),
    )!;
    expect(committed).toBeDefined();
    offer.scheduledStart = committed.scheduledStart;
    offer.scheduledEnd = committed.scheduledEnd;
    api = makeApi(state);
    expect((await api.technician.listOffers()).map((o) => o.id)).not.toContain(offer.id);
    expect(await code(api.technician.acceptOffer(offer.id))).toBe('CONFLICT');
  });

  it('only shows a job to the professional it belongs to', async () => {
    const other = api
      .exportState()
      .bookings.find(
        (b) => b.technicianId && b.technicianId !== RAJESH && b.status === 'confirmed',
      )!;
    expect(await code(api.technician.getJob(other.id))).toBe('NOT_FOUND');
    expect(await code(api.technician.advanceJob(other.id))).toBe('NOT_FOUND');
  });
});

describe('job progress reaches the customer', () => {
  it('follows on the way → arrived → in progress → completed, step by step', async () => {
    const seen: string[] = [];
    for (const expected of ['arrived', 'in_progress', 'completed'] as const) {
      const job = await api.technician.advanceJob(LIVE);
      expect(job.status).toBe(expected);
      await asCustomer();
      const booking = await api.bookings.get(LIVE);
      expect(booking.status).toBe(expected);
      seen.push((await api.notifications.list())[0]!.title.en);
      await asTechnician();
    }
    expect(seen).toEqual([
      'Rajesh Kumar has arrived',
      'Rajesh Kumar has started the work',
      'Service completed',
    ]);
    expect(await code(api.technician.advanceJob(LIVE))).toBe('CONFLICT');

    await asCustomer();
    const done = await api.bookings.get(LIVE);
    const steps = done.timeline.map((e) => e.type).filter((t) => t !== 'reviewed');
    expect(steps.slice(-3)).toEqual(['arrived', 'in_progress', 'completed']);
    expect(done.payment.status).toBe('paid');
  });

  it('cannot start travel before the scheduled day', async () => {
    const future = (await api.technician.listOffers()).find(
      (o) => kuwaitDateOf(o.scheduledStart) > kuwaitDateOf(NOW),
    );
    expect(future).toBeDefined();
    await api.technician.acceptOffer(future!.id);
    expect(await code(api.technician.advanceJob(future!.id))).toBe('CONFLICT');
  });

  it('waits for the customer to answer an extra charge before completing', async () => {
    await api.technician.advanceJob(LIVE); // arrived
    const quoted = await api.technician.addExtraCharge(LIVE, {
      description: 'Replace capacitor',
      amount: 4_500,
    });
    await api.technician.advanceJob(LIVE); // in progress
    expect(await code(api.technician.advanceJob(LIVE))).toBe('CONFLICT');

    await asCustomer();
    const charge = quoted.extraCharges.at(-1)!;
    await api.bookings.respondToExtraCharge(LIVE, charge.id, true);

    await asTechnician();
    const done = await api.technician.advanceJob(LIVE);
    expect(done.status).toBe('completed');
    // Approved extra work is added to the total.
    expect(done.price.total).toBe(quoted.price.total + 4_500);
  });

  it('records work notes and demo photos that the customer can see', async () => {
    expect(
      await code(
        api.technician.addWorkPhoto(LIVE, { media: 'service.ac-cleaning', stage: 'before' }),
      ),
    ).toBe('CONFLICT');
    await api.technician.addWorkNote(LIVE, 'Parking at the back entrance.');
    await api.technician.advanceJob(LIVE); // arrived
    await api.technician.addWorkPhoto(LIVE, { media: 'service.ac-cleaning', stage: 'before' });
    expect(await code(api.technician.addWorkNote(LIVE, 'ok'))).toBe('VALIDATION');
    expect(
      await code(
        api.technician.addWorkPhoto(LIVE, { media: 'not-a-photo' as never, stage: 'after' }),
      ),
    ).toBe('VALIDATION');

    await asCustomer();
    const booking = await api.bookings.get(LIVE);
    expect(booking.workNotes?.map((n) => n.text)).toEqual(['Parking at the back entrance.']);
    expect(booking.workPhotos?.map((p) => [p.media, p.stage])).toEqual([
      ['service.ac-cleaning', 'before'],
    ]);
  });
});

describe('availability and schedule', () => {
  it('refuses working hours that would leave an accepted job uncovered', async () => {
    const job = (await api.technician.listJobs('upcoming')).find((j) => j.status === 'confirmed')!;
    const date = kuwaitDateOf(job.scheduledStart);
    const availability = await api.technician.getAvailability();

    const dayOff = await api.technician
      .updateAvailability({ ...availability, daysOff: [...availability.daysOff, date] })
      .catch((e: unknown) => e);
    expect(dayOff).toBeInstanceOf(ApiError);
    expect((dayOff as ApiError).code).toBe('CONFLICT');
    expect((dayOff as ApiError).details).toContain(job.reference);

    const weekday = weekdayOfLocalDate(date);
    expect(
      await code(
        api.technician.updateAvailability({
          ...availability,
          weekly: { ...availability.weekly, [weekday]: null },
        }),
      ),
    ).toBe('CONFLICT');

    // A free day can still be taken off.
    let free = addDaysToLocalDate(kuwaitDateOf(NOW), 1);
    const busy = new Set(
      (await api.technician.listJobs('all')).map((j) => kuwaitDateOf(j.scheduledStart)),
    );
    while (busy.has(free)) free = addDaysToLocalDate(free, 1);
    const updated = await api.technician.updateAvailability({
      ...availability,
      daysOff: [...availability.daysOff, free],
    });
    expect(updated.daysOff).toContain(free);
  });
});

describe('earnings', () => {
  it('adds a completed job to today’s earnings with its commission', async () => {
    const before = await api.technician.getEarnings('today');
    expect(before.series).toHaveLength(1);
    await api.technician.advanceJob(LIVE);
    await api.technician.advanceJob(LIVE);
    const done = await api.technician.advanceJob(LIVE);
    const after = await api.technician.getEarnings('today');
    expect(after.jobs).toBe(before.jobs + 1);
    expect(after.net - before.net).toBe(done.technicianNet);
    const entry = after.entries.find((e) => e.bookingId === LIVE)!;
    expect(entry.net + entry.commission).toBe(entry.gross);
    expect(after.gross - after.net).toBe(after.commission);
    const dashboard = await api.technician.getDashboard();
    expect(dashboard.earningsToday).toBe(after.net);
  });

  it('keeps entries consistent with the period totals', async () => {
    const month = await api.technician.getEarnings('month');
    expect(month.entries).toHaveLength(month.jobs);
    expect(month.entries.reduce((s, e) => s + e.net, 0)).toBe(month.net);
    const times = month.entries.map((e) => Date.parse(e.completedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});

describe('reviews and documents', () => {
  it('shows a new customer review in the professional’s review history', async () => {
    await api.technician.advanceJob(LIVE);
    await api.technician.advanceJob(LIVE);
    await api.technician.advanceJob(LIVE);
    await asCustomer();
    await api.bookings.submitReview(LIVE, { rating: 5, comment: 'Spotless work, thank you.' });
    await asTechnician();
    const [latest] = await api.technician.listReviews();
    expect(latest?.comment).toBe('Spotless work, thank you.');
    expect(latest?.customerDisplayName).toMatch(/^Noura /);
  });

  it('re-submits only expired or rejected documents (simulated review)', async () => {
    const state = api.exportState();
    const rajesh = state.technicians.find((t) => t.id === RAJESH)!;
    const doc = rajesh.documents[0]!;
    doc.status = 'expired';
    api = makeApi(state);
    await asTechnician();
    const profile = await api.technician.resubmitDocument(doc.id);
    expect(profile.documents.find((d) => d.id === doc.id)?.status).toBe('pending');
    expect(await code(api.technician.resubmitDocument(doc.id))).toBe('CONFLICT');
  });
});
