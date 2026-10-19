/**
 * Personalisation for the home screen, derived from the customer's own
 * bookings — no extra data or hard-coded lists.
 */
import { type Booking, type Service, toMs } from '@myhome/shared';

type BookingLike = Pick<Booking, 'serviceId' | 'categoryId' | 'status' | 'scheduledStart'>;

export interface BookAgainItem {
  service: Service;
  lastBookedAt: string;
}

/** Distinct services from completed bookings, most recent first. */
export function bookAgain(
  bookings: readonly BookingLike[],
  services: readonly Service[],
  limit = 4,
): BookAgainItem[] {
  const byId = new Map(services.filter((s) => s.isActive).map((s) => [s.id, s]));
  const seen = new Set<string>();
  const items: BookAgainItem[] = [];
  for (const b of [...bookings]
    .filter((x) => x.status === 'completed')
    .sort((x, y) => toMs(y.scheduledStart) - toMs(x.scheduledStart))) {
    const service = byId.get(b.serviceId);
    if (!service || seen.has(service.id)) continue;
    seen.add(service.id);
    items.push({ service, lastBookedAt: b.scheduledStart });
    if (items.length >= limit) break;
  }
  return items;
}

/**
 * Services from categories the customer uses most that they have not booked
 * yet, topped up with popular services. Never repeats a service.
 */
export function recommended(
  bookings: readonly BookingLike[],
  services: readonly Service[],
  limit = 6,
): Service[] {
  const active = services.filter((s) => s.isActive);
  const booked = new Set(bookings.map((b) => b.serviceId));
  const categoryWeight = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    categoryWeight.set(b.categoryId, (categoryWeight.get(b.categoryId) ?? 0) + 1);
  }
  const fromHabits = active
    .filter((s) => !booked.has(s.id) && categoryWeight.has(s.categoryId))
    .sort(
      (a, b) =>
        (categoryWeight.get(b.categoryId) ?? 0) - (categoryWeight.get(a.categoryId) ?? 0) ||
        b.rating - a.rating,
    );
  const popular = active
    .filter((s) => !booked.has(s.id))
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || b.bookingsCount - a.bookingsCount);

  const result: Service[] = [];
  for (const s of [...fromHabits, ...popular]) {
    if (!result.some((r) => r.id === s.id)) result.push(s);
    if (result.length >= limit) break;
  }
  return result;
}
