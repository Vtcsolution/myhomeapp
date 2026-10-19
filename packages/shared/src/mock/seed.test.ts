import { describe, expect, it } from 'vitest';
import { calculatePrice, withExtraCharges } from '../domain/pricing';
import { bookingOccupancy, isTechnicianAvailable } from '../domain/schedule';
import { DAY_MS, HOUR_MS, toMs } from '../domain/time';
import { getArea, governorates } from '../geo/kuwait';
import { mediaKeys } from '../types';
import { createSeedState } from './seed';

const NOW = '2026-10-19T07:30:00.000Z'; // Monday 10:30 Kuwait
const state = createSeedState({ now: NOW });
const nowMs = toMs(NOW);
const ARABIC = /[\u0600-\u06FF]/;

describe('seed data', () => {
  it('is deterministic for a given reference time', () => {
    expect(createSeedState({ now: NOW })).toEqual(state);
  });

  it('generates a realistic volume of data', () => {
    expect(state.categories).toHaveLength(10);
    expect(state.services.length).toBeGreaterThanOrEqual(30);
    expect(state.technicians).toHaveLength(20);
    expect(state.bookings.length).toBeGreaterThan(400);
    expect(state.reviews.length).toBeGreaterThan(200);
  });

  it('has unique ids and booking references', () => {
    const ids = state.bookings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const refs = state.bookings.map((b) => b.reference);
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs.every((r) => /^MH-\d{5}$/.test(r))).toBe(true);
  });

  it('only references entities that exist', () => {
    const ids = (list: { id: string }[]) => new Set(list.map((x) => x.id));
    const customers = ids(state.customers);
    const services = ids(state.services);
    const technicians = ids(state.technicians);
    for (const b of state.bookings) {
      expect(customers.has(b.customerId), b.id).toBe(true);
      expect(services.has(b.serviceId), b.id).toBe(true);
      expect(state.services.find((s) => s.id === b.serviceId)?.categoryId, b.id).toBe(b.categoryId);
      if (b.technicianId) expect(technicians.has(b.technicianId), b.id).toBe(true);
      expect(getArea(b.address.areaId), b.id).toBeDefined();
    }
    for (const t of state.technicians) {
      if (t.vendorId) expect(state.vendors.some((v) => v.id === t.vendorId)).toBe(true);
    }
  });

  it('assigns technicians who cover the category and governorate', () => {
    for (const b of state.bookings.filter((x) => x.technicianId)) {
      const t = state.technicians.find((x) => x.id === b.technicianId);
      const governorate = getArea(b.address.areaId)?.governorateId;
      expect(t?.categoryIds, b.id).toContain(b.categoryId);
      expect(t?.governorateIds, b.id).toContain(governorate);
    }
  });

  it('stores prices that match the pricing engine', () => {
    for (const b of state.bookings) {
      const service = state.services.find((s) => s.id === b.serviceId);
      if (!service) throw new Error(b.id);
      const coupon = b.price.couponCode
        ? state.coupons.find((c) => c.code === b.price.couponCode)
        : null;
      const expected = withExtraCharges(
        calculatePrice({ service, selections: b.selections, coupon }),
        b.extraCharges,
      );
      expect(b.price, b.id).toEqual(expected);
    }
  });

  it('never double-books a technician', () => {
    const byTech = new Map<string, { id: string; start: number; end: number }[]>();
    for (const b of state.bookings) {
      if (!b.technicianId || b.status === 'cancelled') continue;
      const occ = bookingOccupancy(b);
      const list = byTech.get(b.technicianId) ?? [];
      list.push({ id: b.id, start: toMs(occ.start), end: toMs(occ.end) });
      byTech.set(b.technicianId, list);
    }
    for (const [techId, list] of byTech) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const cur = list[i];
        expect(
          cur && prev && cur.start >= prev.end,
          `${techId}: ${prev?.id} overlaps ${cur?.id}`,
        ).toBe(true);
      }
    }
  });

  it('schedules generated jobs within the technician’s working hours', () => {
    for (const b of state.bookings) {
      if (!b.technicianId || b.id.startsWith('bkg-demo-live')) continue;
      const t = state.technicians.find((x) => x.id === b.technicianId);
      if (!t) throw new Error(b.id);
      expect(isTechnicianAvailable(t, b.scheduledStart, b.scheduledEnd), b.id).toBe(true);
    }
  });

  it('keeps timelines chronological and never in the future', () => {
    for (const b of state.bookings) {
      expect(b.timeline[0]?.type, b.id).toBe('created');
      const times = b.timeline.map((e) => toMs(e.at));
      expect(
        [...times].sort((x, y) => x - y),
        b.id,
      ).toEqual(times);
      expect(Math.max(...times), b.id).toBeLessThanOrEqual(nowMs);
      expect(toMs(b.scheduledEnd) - toMs(b.scheduledStart)).toBe(2 * HOUR_MS);
    }
  });

  it('has no stale bookings in the past', () => {
    const stale = state.bookings.filter(
      (b) =>
        toMs(b.scheduledStart) < nowMs - DAY_MS &&
        b.status !== 'completed' &&
        b.status !== 'cancelled',
    );
    expect(stale.map((b) => `${b.id}:${b.status}`)).toEqual([]);
  });

  it('keeps payment state consistent with status', () => {
    for (const b of state.bookings) {
      if (b.status === 'completed') {
        expect(b.payment.status, b.id).toBe('paid');
        expect(b.payment.paidAmount, b.id).toBe(b.price.total);
      }
      if (b.status === 'cancelled') {
        expect(b.cancellation, b.id).toBeDefined();
        expect(b.payment.refundedAmount + (b.cancellation?.fee ?? 0), b.id).toBe(
          b.payment.paidAmount,
        );
      }
      if (b.status === 'pending') expect(b.technicianId, b.id).toBeNull();
    }
  });

  it('derives ratings and counters from the data', () => {
    for (const t of state.technicians) {
      const own = state.reviews.filter((r) => r.technicianId === t.id && r.status === 'published');
      expect(t.reviewsCount).toBe(own.length);
      if (own.length) {
        expect(t.rating).toBeCloseTo(own.reduce((s, r) => s + r.rating, 0) / own.length, 2);
      }
      expect(t.jobsCompleted).toBe(
        state.bookings.filter((b) => b.technicianId === t.id && b.status === 'completed').length,
      );
    }
    for (const r of state.reviews) {
      const b = state.bookings.find((x) => x.id === r.bookingId);
      expect(b?.status).toBe('completed');
      expect(b?.reviewId).toBe(r.id);
    }
  });

  it('sets up the demo story', () => {
    const live = state.bookings.find((b) => b.id === 'bkg-demo-live');
    expect(live?.status).toBe('on_the_way');
    expect(live?.technicianId).toBe('tec-01');
    expect(live?.customerId).toBe('cus-01');
    const offers = state.bookings.filter(
      (b) => b.status === 'pending' && b.offeredTo.includes('tec-01'),
    );
    expect(offers.length).toBeGreaterThanOrEqual(2);
    const noura = state.customers.find((c) => c.id === 'cus-01');
    const walletSum = state.walletTransactions
      .filter((t) => t.customerId === 'cus-01')
      .reduce((s, t) => s + t.amount, 0);
    expect(noura?.walletBalance).toBe(walletSum);
    expect(noura?.walletBalance).toBe(12_750);
    const unrated = state.bookings.find((b) => b.id === 'bkg-demo-tv');
    expect(unrated?.status).toBe('completed');
    expect(unrated?.reviewId).toBeUndefined();
  });

  it('covers every category in every governorate', () => {
    for (const category of state.categories) {
      for (const g of governorates) {
        const covered = state.technicians.some(
          (t) =>
            t.status === 'active' &&
            t.categoryIds.includes(category.id) &&
            t.governorateIds.includes(g.id),
        );
        expect(covered, `${category.id} in ${g.id}`).toBe(true);
      }
    }
  });

  it('uses only known media keys and complete bilingual copy', () => {
    const keys = new Set<string>(mediaKeys);
    for (const item of [...state.categories, ...state.services, ...state.promotions]) {
      expect(keys.has(item.image), item.id).toBe(true);
    }
    for (const item of [...state.categories, ...state.services]) {
      expect(item.name.en.trim(), item.id).not.toBe('');
      expect(ARABIC.test(item.name.ar), item.id).toBe(true);
      expect(ARABIC.test(item.description.ar), item.id).toBe(true);
    }
    for (const s of state.services) expect(ARABIC.test(s.shortDescription.ar), s.id).toBe(true);
  });

  it('computes payouts correctly', () => {
    expect(state.payouts.length).toBeGreaterThan(0);
    for (const p of state.payouts) {
      expect(p.netAmount).toBe(p.grossAmount - p.commission);
      expect(p.grossAmount).toBeGreaterThan(0);
      if (p.status === 'paid') expect(p.paidAt).toBeDefined();
    }
  });

  it('seeds successfully at any time of the week', () => {
    const base = Date.parse('2026-10-17T00:00:00.000Z'); // Saturday
    for (let h = 0; h < 7 * 24; h += 13) {
      const seeded = createSeedState({ now: base + h * HOUR_MS });
      expect(seeded.bookings.find((b) => b.id === 'bkg-demo-live')?.status).toBe('on_the_way');
    }
  });
});
