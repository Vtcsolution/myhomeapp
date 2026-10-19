/**
 * Builds the demo database. Everything is generated relative to `now`, so the
 * demo always looks current: a technician is on the way right now, there are
 * jobs today and upcoming bookings, and four months of history behind them.
 *
 * Generation is deterministic for a given `now` (seeded PRNG). Prices come
 * from the real pricing engine and ratings/counters are derived from the
 * generated reviews and bookings, so all numbers agree with each other.
 */
import { brand } from '../brand/brand.config';
import { businessConfig } from '../brand/business.config';
import { calculatePrice } from '../domain/pricing';
import { dayWindows, isTechnicianAvailable } from '../domain/schedule';
import {
  addDaysToLocalDate,
  DAY_MS,
  HOUR_MS,
  kuwaitDateOf,
  kuwaitLocalToISO,
  MINUTE_MS,
  toKuwaitParts,
  toMs,
} from '../domain/time';
import { formatMoney } from '../format/money';
import { getArea } from '../geo/kuwait';
import type {
  Address,
  AppNotification,
  Booking,
  BookingSelections,
  BookingStatus,
  ChatMessage,
  ChatThread,
  Coupon,
  Customer,
  ExtraCharge,
  LocalDate,
  LocalizedText,
  NotificationType,
  PaymentInfo,
  PaymentMethod,
  Payout,
  Promotion,
  Review,
  Service,
  SupportTicket,
  Technician,
  TimelineEvent,
  UserRole,
  Vendor,
  WalletTransaction,
} from '../types';
import { categories, services as serviceCatalog } from './data/catalog';
import {
  cancellationReasons,
  couponSeeds,
  extraChargeTemplates,
  promotionSeeds,
  reviewComments,
  ticketTemplates,
} from './data/content';
import {
  adminSeeds,
  type AddressSeed,
  customerSeeds,
  technicianSeeds,
  vendorSeeds,
} from './data/people';
import { createRng, hashString } from './random';
import { cloneDeep, type MockState } from './state';

const SEED = 20_261_019;
const HISTORY_DAYS = 120;
const FUTURE_DAYS = 7;

export interface SeedOptions {
  /** Reference time for the generated data. Defaults to the current time. */
  now?: Date | string | number;
}

const L = (en: string, ar: string): LocalizedText => ({ en, ar });

interface Plan {
  createdAt: number;
  confirmedAt: number;
  onTheWayAt: number;
  arrivedAt: number;
  inProgressAt: number;
  completedAt: number;
}

interface ExtraDraft {
  description: string;
  amount: number;
  offsetMin: number;
  outcome: 'approved' | 'declined';
}

interface Draft {
  id: string;
  customer: Customer;
  address: Address;
  service: Service;
  selections: BookingSelections;
  windowStart: number;
  technicianId: string | null;
  offeredTo?: string[];
  paymentMethod: PaymentMethod;
  coupon?: Coupon;
  plan: Plan;
  cancel?: { at: number; by: 'customer' | 'admin'; reason: string };
  extras?: ExtraDraft[];
  notes?: string;
}

export function createSeedState(options: SeedOptions = {}): MockState {
  const nowMs = toMs(options.now ?? Date.now());
  const iso = (ms: number) => new Date(ms).toISOString();
  const daysAgo = (days: number) => iso(nowMs - days * DAY_MS);
  const today = kuwaitDateOf(nowMs);
  const rng = createRng(SEED);
  const slotMs = businessConfig.slotLengthMinutes * MINUTE_MS;

  // ── Catalogue & reference data ──────────────────────────────────────────
  const services = cloneDeep(serviceCatalog);
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const svc = (id: string) => required(serviceById.get(id), `service ${id}`);

  const vendors: Vendor[] = vendorSeeds.map(({ joinedDaysAgo, ...v }) => ({
    ...cloneDeep(v),
    joinedAt: daysAgo(joinedDaysAgo),
  }));

  const technicians: Technician[] = technicianSeeds.map((seed) => {
    const { joinedDaysAgo, documents, ...t } = cloneDeep(seed);
    return {
      ...t,
      rating: 0,
      reviewsCount: 0,
      jobsCompleted: 0,
      joinedAt: daysAgo(joinedDaysAgo),
      documents: documents.map(({ expiresInDays, ...d }) => ({
        ...d,
        uploadedAt: daysAgo(joinedDaysAgo),
        expiresAt: iso(nowMs + expiresInDays * DAY_MS),
      })),
    };
  });
  const techById = new Map(technicians.map((t) => [t.id, t]));
  const tech = (id: string) => required(techById.get(id), `technician ${id}`);

  const toAddress = (seed: AddressSeed, isDefault: boolean): Address => {
    const area = required(getArea(seed.areaId), `area ${seed.areaId}`);
    const jitter = createRng(hashString(seed.id));
    const round = (n: number) => Math.round(n * 1e6) / 1e6;
    return {
      ...seed,
      isDefault,
      location: {
        lat: round(area.center.lat + (jitter.next() - 0.5) * 0.012),
        lng: round(area.center.lng + (jitter.next() - 0.5) * 0.012),
      },
    };
  };

  const customers: Customer[] = customerSeeds.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    ...(c.email ? { email: c.email } : {}),
    preferredLocale: c.preferredLocale,
    membership: c.membership,
    addresses: c.addresses.map((a, i) => toAddress(a, i === 0)),
    walletBalance: 0,
    status: c.status ?? 'active',
    createdAt: daysAgo(c.joinedDaysAgo),
  }));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const customer = (id: string) => required(customerById.get(id), `customer ${id}`);

  const coupons: Coupon[] = couponSeeds.map(({ validFromDays, validUntilDays, ...c }) => ({
    ...cloneDeep(c),
    ...(c.maxDiscount !== undefined ? { maxDiscount: c.maxDiscount } : {}),
    validFrom: iso(nowMs + validFromDays * DAY_MS),
    validUntil: iso(nowMs + validUntilDays * DAY_MS),
  }));
  const coupon = (code: string) =>
    required(
      coupons.find((c) => c.code === code),
      `coupon ${code}`,
    );

  const promotions: Promotion[] = promotionSeeds.map(({ validUntilDays, ...p }) => ({
    ...cloneDeep(p),
    validUntil: iso(nowMs + validUntilDays * DAY_MS),
  }));

  // ── Scheduling helpers ──────────────────────────────────────────────────
  const occupancy = new Map<string, { start: number; end: number }[]>();
  const occupiedUntil = (start: number, durationMin: number) =>
    start + Math.max(slotMs, durationMin * MINUTE_MS);
  const isFree = (techId: string, start: number, end: number) =>
    !(occupancy.get(techId) ?? []).some((o) => o.start < end && start < o.end);
  const occupy = (techId: string, start: number, end: number) => {
    const list = occupancy.get(techId) ?? [];
    list.push({ start, end });
    occupancy.set(techId, list);
  };

  const durationOf = (service: Service, selections: BookingSelections) =>
    calculatePrice({ service, selections }).estimatedDurationMin;

  /** First window (by closeness to `hour`) where the technician is available and free. */
  const findWindow = (
    technician: Technician,
    fromDate: LocalDate,
    durationMin: number,
    opts: { hour: number; direction?: 1 | -1; minStart?: number },
  ): number => {
    const direction = opts.direction ?? 1;
    for (let i = 0; i < 10; i++) {
      const date = addDaysToLocalDate(fromDate, i * direction);
      const windows = dayWindows(date).sort(
        (a, b) =>
          Math.abs(toKuwaitParts(a.start).hour - opts.hour) -
          Math.abs(toKuwaitParts(b.start).hour - opts.hour),
      );
      for (const w of windows) {
        const start = toMs(w.start);
        if (opts.minStart !== undefined && start < opts.minStart) continue;
        if (!isTechnicianAvailable(technician, w.start, w.end)) continue;
        if (!isFree(technician.id, start, occupiedUntil(start, durationMin))) continue;
        return start;
      }
    }
    throw new Error(`Seed: no window found for ${technician.id} from ${fromDate}`);
  };

  const planLifecycle = (windowStart: number, durationMin: number, createdAt: number): Plan => {
    const onTheWayAt = windowStart + rng.int(-20, 30) * MINUTE_MS;
    const arrivedAt = onTheWayAt + rng.int(15, 35) * MINUTE_MS;
    const inProgressAt = arrivedAt + rng.int(3, 8) * MINUTE_MS;
    const completedAt =
      inProgressAt + Math.round(durationMin * (0.9 + rng.next() * 0.25)) * MINUTE_MS;
    const confirmedAt = Math.min(createdAt + rng.int(3, 45) * MINUTE_MS, onTheWayAt - MINUTE_MS);
    return { createdAt, confirmedAt, onTheWayAt, arrivedAt, inProgressAt, completedAt };
  };

  const simRef = () =>
    `SIM-${Math.floor(rng.next() * 0xffffffff)
      .toString(16)
      .toUpperCase()
      .padStart(8, '0')}`;

  // ── Booking builder ─────────────────────────────────────────────────────
  const build = (d: Draft): Booking => {
    const { plan } = d;
    const limit = d.cancel ? d.cancel.at : nowMs;
    const timeline: TimelineEvent[] = [
      { type: 'created', at: iso(plan.createdAt), actor: 'customer' },
    ];
    let status: BookingStatus = 'pending';
    let technicianId = d.technicianId;

    if (technicianId) {
      const steps = [
        ['confirmed', plan.confirmedAt],
        ['on_the_way', plan.onTheWayAt],
        ['arrived', plan.arrivedAt],
        ['in_progress', plan.inProgressAt],
        ['completed', plan.completedAt],
      ] as const;
      for (const [type, at] of steps) {
        if (at > limit) break;
        timeline.push({ type, at: iso(at), actor: 'technician' });
        status = type;
      }
      // Cancelled before anyone accepted: no technician on record.
      if (status === 'pending') technicianId = null;
    }

    const extraCharges: ExtraCharge[] = [];
    if (d.extras && (status === 'in_progress' || status === 'completed')) {
      d.extras.forEach((extra, index) => {
        const createdAt = plan.inProgressAt + extra.offsetMin * MINUTE_MS;
        if (createdAt > limit) return;
        const respondedAt = createdAt + rng.int(3, 12) * MINUTE_MS;
        const responded = respondedAt <= limit;
        extraCharges.push({
          id: `${d.id}-x${index + 1}`,
          description: extra.description,
          amount: extra.amount,
          status: responded ? extra.outcome : 'pending_approval',
          createdAt: iso(createdAt),
          ...(responded ? { respondedAt: iso(respondedAt) } : {}),
        });
        timeline.push({
          type: 'extra_charge_added',
          at: iso(createdAt),
          actor: 'technician',
          note: extra.description,
        });
        if (responded) {
          timeline.push({
            type: extra.outcome === 'approved' ? 'extra_charge_approved' : 'extra_charge_declined',
            at: iso(respondedAt),
            actor: 'customer',
          });
        }
      });
    }

    if (d.cancel) {
      status = 'cancelled';
      timeline.push({
        type: 'cancelled',
        at: iso(d.cancel.at),
        actor: d.cancel.by,
        note: d.cancel.reason,
      });
    }
    timeline.sort((a, b) => toMs(a.at) - toMs(b.at));

    const price = calculatePrice({
      service: d.service,
      selections: d.selections,
      coupon: d.coupon ?? null,
      extraCharges,
    });
    const approvedExtras = extraCharges
      .filter((x) => x.status === 'approved')
      .reduce((sum, x) => sum + x.amount, 0);

    const prepaid = d.paymentMethod !== 'cash';
    const payment: PaymentInfo = {
      method: d.paymentMethod,
      status: 'unpaid',
      paidAmount: 0,
      refundedAmount: 0,
    };
    if (prepaid) {
      payment.status = 'paid';
      payment.paidAmount = price.total - approvedExtras;
      payment.paidAt = iso(plan.createdAt);
      payment.reference = simRef();
    }
    if (status === 'completed') {
      payment.status = 'paid';
      payment.paidAmount = price.total;
      payment.paidAt = iso(prepaid ? plan.createdAt : plan.completedAt);
      payment.reference ??= simRef();
    }

    let cancellation: Booking['cancellation'];
    if (d.cancel) {
      const late =
        d.cancel.by === 'customer' &&
        d.cancel.at > d.windowStart - businessConfig.freeCancellationHours * HOUR_MS;
      const fee = late ? Math.min(businessConfig.lateCancellationFee, payment.paidAmount) : 0;
      const refund = payment.paidAmount - fee;
      payment.refundedAmount = refund;
      if (refund > 0) payment.status = fee > 0 ? 'partially_refunded' : 'refunded';
      cancellation = {
        by: d.cancel.by,
        reason: d.cancel.reason,
        at: iso(d.cancel.at),
        fee,
        refundAmount: refund,
      };
    }

    const technician = technicianId ? tech(technicianId) : null;
    return {
      id: d.id,
      reference: '',
      customerId: d.customer.id,
      serviceId: d.service.id,
      categoryId: d.service.categoryId,
      selections: d.selections,
      address: cloneDeep(d.address),
      scheduledStart: iso(d.windowStart),
      scheduledEnd: iso(d.windowStart + slotMs),
      status,
      technicianId,
      vendorId: technician?.vendorId ?? null,
      offeredTo: status === 'pending' ? (d.offeredTo ?? []) : [],
      declinedBy: [],
      price,
      payment,
      extraCharges,
      ...(d.notes ? { customerNotes: d.notes } : {}),
      timeline,
      ...(cancellation ? { cancellation } : {}),
      createdAt: iso(plan.createdAt),
      updatedAt: timeline[timeline.length - 1]?.at ?? iso(plan.createdAt),
    };
  };

  const bookings: Booking[] = [];
  const add = (d: Draft) => {
    const booking = build(d);
    bookings.push(booking);
    if (booking.technicianId && booking.status !== 'cancelled') {
      occupy(
        booking.technicianId,
        d.windowStart,
        occupiedUntil(d.windowStart, booking.price.estimatedDurationMin),
      );
    }
    return booking;
  };

  // ── Hand-crafted demo story ─────────────────────────────────────────────
  const noura = customer('cus-01');
  const nouraHome = required(noura.addresses[0], 'Noura home address');

  const sel = (
    options: Record<string, string>,
    units = 1,
    addOnIds: string[] = [],
  ): BookingSelections => ({
    options,
    units,
    addOnIds,
  });

  // Live: Rajesh is on his way to Noura right now.
  const liveSelections = sel({ 'ac-type': 'split' }, 3, ['anti-bacterial']);
  const liveStart = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  const liveCreated = nowMs - 2 * DAY_MS - 3 * HOUR_MS;
  const live = add({
    id: 'bkg-demo-live',
    customer: noura,
    address: nouraHome,
    service: svc('svc-ac-cleaning'),
    selections: liveSelections,
    windowStart: liveStart,
    technicianId: 'tec-01',
    paymentMethod: 'knet',
    coupon: coupon('COOL25'),
    notes: 'Three split units upstairs. Parking is available in front of the gate.',
    plan: {
      createdAt: liveCreated,
      confirmedAt: liveCreated + 14 * MINUTE_MS,
      onTheWayAt: nowMs - 8 * MINUTE_MS,
      arrivedAt: nowMs + 16 * MINUTE_MS,
      inProgressAt: nowMs + 20 * MINUTE_MS,
      completedAt: nowMs + 3 * HOUR_MS,
    },
  });

  // Upcoming, confirmed: pest control with Anil.
  const pestSelections = sel({ 'property-size': 'pest-villa' });
  const pestStart = findWindow(
    tech('tec-07'),
    addDaysToLocalDate(today, 1),
    durationOf(svc('svc-pest-general'), pestSelections),
    {
      hour: 10,
      minStart: nowMs + 12 * HOUR_MS,
    },
  );
  const pestCreated = nowMs - 26 * HOUR_MS;
  const pest = add({
    id: 'bkg-demo-pest',
    customer: noura,
    address: nouraHome,
    service: svc('svc-pest-general'),
    selections: pestSelections,
    windowStart: pestStart,
    technicianId: 'tec-07',
    paymentMethod: 'apple_pay',
    plan: {
      createdAt: pestCreated,
      confirmedAt: pestCreated + 25 * MINUTE_MS,
      onTheWayAt: pestStart,
      arrivedAt: pestStart + 25 * MINUTE_MS,
      inProgressAt: pestStart + 30 * MINUTE_MS,
      completedAt: pestStart + 3 * HOUR_MS,
    },
  });

  // Upcoming, still being matched: deep cleaning.
  const deepSelections = sel({ 'property-size': 'villa-floor' }, 1, ['oven']);
  const deepStart = findWindow(
    tech('tec-05'),
    addDaysToLocalDate(today, 3),
    durationOf(svc('svc-cleaning-deep'), deepSelections),
    {
      hour: 16,
    },
  );
  const deepCreated = nowMs - 3 * HOUR_MS;
  const deep = add({
    id: 'bkg-demo-deep',
    customer: noura,
    address: nouraHome,
    service: svc('svc-cleaning-deep'),
    selections: deepSelections,
    windowStart: deepStart,
    technicianId: null,
    offeredTo: ['tec-05', 'tec-20'],
    paymentMethod: 'apple_pay',
    notes: 'Please give extra attention to the kitchen and the diwaniya.',
    plan: planLifecycle(deepStart, 0, deepCreated),
  });

  // History.
  const pastDraft = (
    id: string,
    serviceId: string,
    selections: BookingSelections,
    techId: string,
    days: number,
    hour: number,
    paymentMethod: PaymentMethod,
    extras?: ExtraDraft[],
  ): Draft => {
    const service = svc(serviceId);
    const start = findWindow(
      tech(techId),
      addDaysToLocalDate(today, -days),
      durationOf(service, selections),
      {
        hour,
        direction: -1,
      },
    );
    return {
      id,
      customer: noura,
      address: nouraHome,
      service,
      selections,
      windowStart: start,
      technicianId: techId,
      paymentMethod,
      plan: planLifecycle(start, durationOf(service, selections), start - DAY_MS - 2 * HOUR_MS),
      ...(extras ? { extras } : {}),
    };
  };

  const leak = add(
    pastDraft(
      'bkg-demo-leak',
      'svc-plumbing-leak',
      sel({ location: 'bathroom' }),
      'tec-08',
      9,
      11,
      'knet',
      [
        {
          description: 'Replace concealed pipe joint',
          amount: 18_000,
          offsetMin: 20,
          outcome: 'approved',
        },
      ],
    ),
  );
  const gas = add(
    pastDraft(
      'bkg-demo-gas',
      'svc-ac-gas',
      sel({ 'gas-type': 'r410a' }, 2),
      'tec-01',
      24,
      15,
      'card',
    ),
  );
  const tv = add(
    pastDraft(
      'bkg-demo-tv',
      'svc-handyman-tv',
      sel({ 'tv-size': '56-75' }, 1, ['cable-conceal']),
      'tec-15',
      3,
      18,
      'apple_pay',
    ),
  );
  const deepPast = add(
    pastDraft(
      'bkg-demo-deep-past',
      'svc-cleaning-deep',
      sel({ 'property-size': 'villa-floor' }),
      'tec-05',
      45,
      10,
      'card',
    ),
  );

  const cancelledStart = toMs(kuwaitLocalToISO(addDaysToLocalDate(today, -15), '10:00'));
  const cancelledCreated = cancelledStart - 2 * DAY_MS;
  const cancelled = add({
    id: 'bkg-demo-cancelled',
    customer: noura,
    address: required(noura.addresses[1], 'Noura family address'),
    service: svc('svc-cleaning-regular'),
    selections: sel({ cleaners: 'one' }, 2),
    windowStart: cancelledStart,
    technicianId: null,
    paymentMethod: 'wallet',
    plan: planLifecycle(cancelledStart, 120, cancelledCreated),
    cancel: { at: cancelledCreated + 2 * HOUR_MS, by: 'customer', reason: 'Plans changed' },
  });

  // Rajesh's other work: a job later today (or the next working day) and two open offers.
  const repairSelections = sel({ 'ac-type': 'split' });
  const laterStart = findWindow(tech('tec-01'), today, 60, {
    hour: 16,
    minStart: nowMs + 2 * HOUR_MS,
  });
  const laterCreated = nowMs - 5 * HOUR_MS;
  const later = add({
    id: 'bkg-demo-later',
    customer: customer('cus-09'),
    address: required(customer('cus-09').addresses[0], 'cus-09 address'),
    service: svc('svc-ac-repair'),
    selections: repairSelections,
    windowStart: laterStart,
    technicianId: 'tec-01',
    paymentMethod: 'cash',
    notes: 'The master bedroom AC is leaking water onto the floor.',
    plan: {
      createdAt: laterCreated,
      confirmedAt: laterCreated + 9 * MINUTE_MS,
      onTheWayAt: laterStart,
      arrivedAt: laterStart + 25 * MINUTE_MS,
      inProgressAt: laterStart + 30 * MINUTE_MS,
      completedAt: laterStart + 2 * HOUR_MS,
    },
  });

  const offer = (
    id: string,
    customerId: string,
    serviceId: string,
    selections: BookingSelections,
    offeredTo: string[],
    fromDay: number,
    hour: number,
    createdAgoMin: number,
    paymentMethod: PaymentMethod,
  ) => {
    const service = svc(serviceId);
    const duration = durationOf(service, selections);
    const start = findWindow(tech('tec-01'), addDaysToLocalDate(today, fromDay), duration, {
      hour,
      minStart: nowMs + 6 * HOUR_MS,
    });
    // Keep Rajesh free for the offer so accepting it in the demo always succeeds.
    occupy('tec-01', start, occupiedUntil(start, duration));
    const c = customer(customerId);
    return add({
      id,
      customer: c,
      address: required(c.addresses[0], `${customerId} address`),
      service,
      selections,
      windowStart: start,
      technicianId: null,
      offeredTo,
      paymentMethod,
      plan: planLifecycle(start, duration, nowMs - createdAgoMin * MINUTE_MS),
    });
  };
  const offerGas = offer(
    'bkg-demo-offer-1',
    'cus-04',
    'svc-ac-gas',
    sel({ 'gas-type': 'r22' }, 2),
    ['tec-01', 'tec-02'],
    1,
    12,
    40,
    'knet',
  );
  const offerInstall = offer(
    'bkg-demo-offer-2',
    'cus-03',
    'svc-ac-installation',
    sel({ capacity: '2-ton' }, 1, ['bracket']),
    ['tec-01', 'tec-19'],
    2,
    10,
    120,
    'card',
  );

  // ── Generated history and near-future bookings ─────────────────────────
  const customerPool = customers
    .filter((c) => c.id !== 'cus-01' && c.status === 'active')
    .map((c) => [c, c.membership === 'platinum' ? 3 : c.membership === 'gold' ? 2 : 1] as const);
  const servicePool = services.map(
    (s) => [s, (s.isPopular ? 3 : 1) * (s.categoryId === 'cat-ac' ? 1.5 : 1)] as const,
  );
  const methodPool = [
    ['knet', 45],
    ['apple_pay', 22],
    ['card', 18],
    ['cash', 15],
  ] as const;

  const randomSelections = (service: Service): BookingSelections => {
    const options: Record<string, string> = {};
    for (const g of service.optionGroups) {
      const weights = g.choices.map((c, i) => [c.id, i === 0 ? 3 : 1] as const);
      options[g.id] = rng.weighted(weights);
    }
    const unitCap = Math.min(service.maxUnits, service.minUnits + 3);
    const units =
      service.pricingModel === 'per_unit' || service.pricingModel === 'hourly'
        ? rng.weighted(
            Array.from(
              { length: unitCap - service.minUnits + 1 },
              (_, i) => [service.minUnits + i, 4 - Math.min(i, 3)] as const,
            ),
          )
        : 1;
    const addOnIds = service.addOns.filter(() => rng.chance(0.3)).map((a) => a.id);
    return { options, units, addOnIds };
  };

  let sequence = 1;
  for (let offset = -HISTORY_DAYS; offset <= FUTURE_DAYS; offset++) {
    const date = addDaysToLocalDate(today, offset);
    const growth = (offset > -60 ? 1 : 0) + (offset > -30 ? 1 : 0);
    const count = offset === 0 ? 7 : offset > 0 ? rng.int(2, 5) : rng.int(2, 5) + growth;
    const windows = dayWindows(date);

    for (let n = 0; n < count; n++) {
      const c = rng.weighted(customerPool);
      const address = required(c.addresses[0], `${c.id} address`);
      const governorate = required(getArea(address.areaId), address.areaId).governorateId;
      const service = rng.weighted(servicePool);
      const selections = randomSelections(service);
      const duration = durationOf(service, selections);
      const window = rng.pick(windows);
      const start = toMs(window.start);
      const end = occupiedUntil(start, duration);
      const isFuture = start > nowMs;

      const eligible = technicians.filter(
        (t) =>
          t.categoryIds.includes(service.categoryId) &&
          t.governorateIds.includes(governorate) &&
          (t.status === 'active' || (t.status === 'suspended' && start < nowMs - 15 * DAY_MS)) &&
          toMs(t.joinedAt) < start - DAY_MS &&
          isTechnicianAvailable(t, window.start, window.end) &&
          isFree(t.id, start, end),
      );
      if (!eligible.length) continue;

      const createdAt = Math.min(
        start - rng.int(180, 6 * 24 * 60) * MINUTE_MS,
        nowMs - rng.int(5, 600) * MINUTE_MS,
      );
      const cancel = rng.chance(isFuture ? 0.04 : 0.09)
        ? {
            at: createdAt + Math.floor(rng.next() * (Math.min(start, nowMs) - createdAt)),
            by: rng.chance(0.85) ? ('customer' as const) : ('admin' as const),
            reason: rng.pick(cancellationReasons),
          }
        : undefined;
      const pending = isFuture && !cancel && rng.chance(0.25);

      let chosenCoupon: Coupon | undefined;
      if (service.categoryId === 'cat-ac' && rng.chance(0.12)) {
        const cool = coupon('COOL25');
        if (calculatePrice({ service, selections }).subtotal >= cool.minSubtotal)
          chosenCoupon = cool;
      }

      const template = extraChargeTemplates[service.categoryId];
      const extras: ExtraDraft[] | undefined =
        service.pricingModel === 'inspection' && template && rng.chance(0.75)
          ? [
              (() => {
                const t = rng.pick(template);
                return {
                  description: t.description,
                  amount: Math.round(rng.int(t.min, t.max) / 500) * 500,
                  offsetMin: rng.int(10, 25),
                  outcome: rng.chance(0.9) ? ('approved' as const) : ('declined' as const),
                };
              })(),
            ]
          : undefined;

      add({
        id: `bkg-${String(sequence++).padStart(4, '0')}`,
        customer: c,
        address,
        service,
        selections,
        windowStart: start,
        technicianId: pending ? null : rng.pick(eligible).id,
        ...(pending ? { offeredTo: rng.sample(eligible, 3).map((t) => t.id) } : {}),
        paymentMethod: rng.weighted(methodPool),
        ...(chosenCoupon ? { coupon: chosenCoupon } : {}),
        plan: planLifecycle(start, duration, createdAt),
        ...(cancel ? { cancel } : {}),
        ...(extras ? { extras } : {}),
      });
    }
  }

  // References in creation order.
  [...bookings]
    .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))
    .forEach((b, i) => {
      b.reference = `MH-${48_213 + i}`;
    });

  const completedAt = (b: Booking) => b.timeline.find((e) => e.type === 'completed')?.at;

  // ── Reviews ─────────────────────────────────────────────────────────────
  const reviews: Review[] = [];
  const addReview = (
    b: Booking,
    rating: Review['rating'],
    text: string,
    language: 'en' | 'ar',
    delayMin: number,
  ) => {
    const done = completedAt(b);
    if (!done || !b.technicianId) return;
    const at = Math.min(toMs(done) + delayMin * MINUTE_MS, nowMs - 5 * MINUTE_MS);
    const review: Review = {
      id: `rev-${b.id}`,
      bookingId: b.id,
      customerId: b.customerId,
      technicianId: b.technicianId,
      serviceId: b.serviceId,
      rating,
      comment: text,
      language,
      status: 'published',
      createdAt: iso(at),
    };
    reviews.push(review);
    b.reviewId = review.id;
    b.timeline.push({ type: 'reviewed', at: review.createdAt, actor: 'customer' });
  };

  addReview(
    leak,
    5,
    'Hassan found the leak within minutes and explained the repair clearly. Very professional.',
    'en',
    90,
  );
  addReview(
    gas,
    5,
    'Rajesh was right on time and all the ACs are cooling perfectly again.',
    'en',
    240,
  );
  addReview(
    deepPast,
    4,
    'Great deep clean. The team arrived a little late but were very thorough.',
    'en',
    600,
  );

  const demoIds = new Set(bookings.filter((b) => b.id.startsWith('bkg-demo')).map((b) => b.id));
  for (const b of bookings) {
    if (demoIds.has(b.id) || b.status !== 'completed') continue;
    const done = completedAt(b);
    if (!done || toMs(done) > nowMs - 15 * MINUTE_MS || !rng.chance(0.68)) continue;
    const rating = rng.weighted([
      [5, 62],
      [4, 27],
      [3, 7],
      [2, 3],
      [1, 1],
    ] as const);
    const comment = rng.pick(reviewComments[rating]);
    addReview(b, rating, comment.text, comment.language, rng.int(30, 2_880));
  }
  for (const r of reviews) if (r.rating <= 2 && rng.chance(0.5)) r.status = 'flagged';
  const hideable = reviews.find((r) => r.rating === 3);
  if (hideable) hideable.status = 'hidden';

  // ── Aggregates ──────────────────────────────────────────────────────────
  const round2 = (n: number) => Math.round(n * 100) / 100;
  for (const t of technicians) {
    const own = reviews.filter((r) => r.technicianId === t.id && r.status === 'published');
    t.reviewsCount = own.length;
    t.rating = own.length ? round2(own.reduce((s, r) => s + r.rating, 0) / own.length) : 0;
    t.jobsCompleted = bookings.filter(
      (b) => b.technicianId === t.id && b.status === 'completed',
    ).length;
  }
  for (const s of services) {
    const own = reviews.filter((r) => r.serviceId === s.id && r.status === 'published');
    s.reviewsCount = own.length;
    s.rating = own.length ? round2(own.reduce((sum, r) => sum + r.rating, 0) / own.length) : 0;
    s.bookingsCount = bookings.filter(
      (b) => b.serviceId === s.id && b.status !== 'cancelled',
    ).length;
  }

  // ── Payouts (weekly, Sunday–Saturday) ───────────────────────────────────
  const payouts: Payout[] = [];
  const weekStart = addDaysToLocalDate(today, -toKuwaitParts(nowMs).weekday);
  const payees: { type: 'technician' | 'vendor'; id: string; rate: number; techIds: string[] }[] = [
    ...technicians
      .filter((t) => t.vendorId === null)
      .map((t) => ({
        type: 'technician' as const,
        id: t.id,
        rate: businessConfig.defaultCommissionRate,
        techIds: [t.id],
      })),
    ...vendors.map((v) => ({
      type: 'vendor' as const,
      id: v.id,
      rate: v.commissionRate,
      techIds: technicians.filter((t) => t.vendorId === v.id).map((t) => t.id),
    })),
  ];
  for (let k = 0; k <= 8; k++) {
    const periodStart = toMs(kuwaitLocalToISO(addDaysToLocalDate(weekStart, -7 * k)));
    const periodEnd = periodStart + 7 * DAY_MS;
    for (const payee of payees) {
      const jobs = bookings.filter((b) => {
        const done = completedAt(b);
        return (
          b.status === 'completed' &&
          b.technicianId !== null &&
          payee.techIds.includes(b.technicianId) &&
          done !== undefined &&
          toMs(done) >= periodStart &&
          toMs(done) < periodEnd
        );
      });
      if (!jobs.length) continue;
      const gross = jobs.reduce((sum, b) => sum + b.price.total, 0);
      const commission = Math.round(gross * payee.rate);
      payouts.push({
        id: `pay-${payee.id}-w${k}`,
        payeeType: payee.type,
        payeeId: payee.id,
        periodStart: iso(periodStart),
        periodEnd: iso(periodEnd),
        jobsCount: jobs.length,
        grossAmount: gross,
        commission,
        netAmount: gross - commission,
        status: k === 0 ? 'scheduled' : k === 1 ? 'processing' : 'paid',
        ...(k >= 2 ? { paidAt: iso(periodEnd + 2 * DAY_MS) } : {}),
      });
    }
  }

  // ── Wallet ──────────────────────────────────────────────────────────────
  const walletTransactions: WalletTransaction[] = [];
  const txn = (
    type: WalletTransaction['type'],
    amount: number,
    at: number,
    description: LocalizedText,
    bookingId?: string,
  ) =>
    walletTransactions.push({
      id: `wtx-${walletTransactions.length + 1}`,
      customerId: noura.id,
      type,
      amount,
      description,
      ...(bookingId ? { bookingId } : {}),
      createdAt: iso(at),
    });
  txn('top_up', 10_000, nowMs - 60 * DAY_MS, L('Wallet top-up via KNET', 'شحن المحفظة عبر كي نت'));
  txn(
    'cashback',
    1_500,
    toMs(completedAt(deepPast) ?? deepPast.createdAt) + DAY_MS,
    L('Gold member cashback', 'استرداد نقدي للعضوية الذهبية'),
    deepPast.id,
  );
  txn(
    'payment',
    -cancelled.payment.paidAmount,
    toMs(cancelled.createdAt),
    L(`Payment for ${cancelled.reference}`, `دفع الحجز ${cancelled.reference}`),
    cancelled.id,
  );
  txn(
    'refund',
    cancelled.payment.refundedAmount,
    toMs(cancelled.cancellation?.at ?? cancelled.createdAt),
    L(`Refund for ${cancelled.reference}`, `استرداد الحجز ${cancelled.reference}`),
    cancelled.id,
  );
  txn(
    'cashback',
    1_250,
    toMs(completedAt(gas) ?? gas.createdAt) + DAY_MS,
    L('Gold member cashback', 'استرداد نقدي للعضوية الذهبية'),
    gas.id,
  );
  walletTransactions.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  noura.walletBalance = walletTransactions.reduce((sum, t) => sum + t.amount, 0);

  // ── Notifications ───────────────────────────────────────────────────────
  const notifications: AppNotification[] = [];
  const notify = (
    recipientRole: UserRole,
    recipientId: string,
    type: NotificationType,
    title: LocalizedText,
    body: LocalizedText,
    at: number | string,
    read: boolean,
    bookingId?: string,
  ) =>
    notifications.push({
      id: `ntf-${notifications.length + 1}`,
      recipientRole,
      recipientId,
      type,
      title,
      body,
      read,
      createdAt: typeof at === 'number' ? iso(at) : at,
      ...(bookingId ? { bookingId } : {}),
    });

  notify(
    'customer',
    noura.id,
    'system',
    L(`Welcome to ${brand.name}`, `أهلاً بك في ${brand.name_ar}`),
    L('Your home, cared for by vetted professionals.', 'منزلك في أيدٍ أمينة مع محترفين موثوقين.'),
    noura.createdAt,
    true,
  );
  notify(
    'customer',
    noura.id,
    'payment',
    L('Refund issued', 'تم الاسترداد'),
    L(
      `${formatMoney(cancelled.payment.refundedAmount)} returned to your wallet for ${cancelled.reference}.`,
      `تمت إعادة ${formatMoney(cancelled.payment.refundedAmount, { locale: 'ar' })} إلى محفظتك للحجز ${cancelled.reference}.`,
    ),
    cancelled.cancellation?.at ?? cancelled.createdAt,
    true,
    cancelled.id,
  );
  notify(
    'customer',
    noura.id,
    'promotion',
    L('Breathe easier this season', 'تنفّس هواءً أنقى هذا الموسم'),
    L(
      'Use COOL25 for 25% off AC deep cleaning.',
      'استخدم COOL25 للحصول على خصم 25% على تنظيف المكيفات.',
    ),
    nowMs - 2 * DAY_MS,
    true,
  );
  notify(
    'customer',
    noura.id,
    'booking_update',
    L('How did we do?', 'كيف كانت تجربتك؟'),
    L('Rate your TV Wall Mounting with Mark Reyes.', 'قيّم خدمة تركيب التلفزيون مع مارك رييس.'),
    completedAt(tv) ?? tv.updatedAt,
    false,
    tv.id,
  );
  notify(
    'customer',
    noura.id,
    'booking_update',
    L('Booking confirmed', 'تم تأكيد الحجز'),
    L(
      'Anil Menon will handle your General Pest Control.',
      'سيتولى أنيل مينون خدمة مكافحة الحشرات.',
    ),
    pest.timeline.find((e) => e.type === 'confirmed')?.at ?? pest.createdAt,
    true,
    pest.id,
  );
  notify(
    'customer',
    noura.id,
    'booking_update',
    L('Booking received', 'تم استلام الحجز'),
    L(
      "We're matching the best available professional for your Deep Home Cleaning.",
      'نعمل على اختيار أفضل محترف متاح لخدمة التنظيف العميق.',
    ),
    deep.createdAt,
    false,
    deep.id,
  );
  notify(
    'customer',
    noura.id,
    'booking_update',
    L('Rajesh is on the way', 'راجيش في الطريق إليك'),
    L(
      'Your AC Deep Cleaning technician has set off and will arrive shortly.',
      'انطلق فني تنظيف المكيفات وسيصل قريباً.',
    ),
    nowMs - 8 * MINUTE_MS,
    false,
    live.id,
  );

  const lastPaid = payouts
    .filter((p) => p.payeeId === 'tec-01' && p.status === 'paid')
    .sort((a, b) => toMs(b.periodEnd) - toMs(a.periodEnd))[0];
  if (lastPaid?.paidAt) {
    notify(
      'technician',
      'tec-01',
      'payment',
      L('Payout sent', 'تم تحويل المستحقات'),
      L(
        `${formatMoney(lastPaid.netAmount)} has been transferred to your bank account.`,
        `تم تحويل ${formatMoney(lastPaid.netAmount, { locale: 'ar' })} إلى حسابك البنكي.`,
      ),
      lastPaid.paidAt,
      true,
    );
  }
  const gasReview = reviews.find((r) => r.bookingId === gas.id);
  if (gasReview) {
    notify(
      'technician',
      'tec-01',
      'system',
      L('New 5-star review', 'تقييم جديد بخمس نجوم'),
      L('Noura K. rated your AC Gas Refill 5 stars.', 'قيّمت نورة ك. خدمة تعبئة الغاز بخمس نجوم.'),
      gasReview.createdAt,
      true,
      gas.id,
    );
  }
  notify(
    'technician',
    'tec-01',
    'booking_update',
    L('Job confirmed', 'تم تأكيد المهمة'),
    L(
      'AC Repair & Diagnosis in Adailiya has been added to your schedule.',
      'تمت إضافة تشخيص وإصلاح المكيفات في العديلية إلى جدولك.',
    ),
    later.timeline.find((e) => e.type === 'confirmed')?.at ?? later.createdAt,
    true,
    later.id,
  );
  notify(
    'technician',
    'tec-01',
    'job_offer',
    L('New job request', 'طلب عمل جديد'),
    L(
      'Split AC Installation in Salmiya — respond to secure the job.',
      'تركيب مكيف سبليت في السالمية — بادر بالرد لتأكيد المهمة.',
    ),
    offerInstall.createdAt,
    false,
    offerInstall.id,
  );
  notify(
    'technician',
    'tec-01',
    'job_offer',
    L('New job request', 'طلب عمل جديد'),
    L(
      'AC Gas Refill in Qortuba — respond to secure the job.',
      'تعبئة غاز المكيف في قرطبة — بادر بالرد لتأكيد المهمة.',
    ),
    offerGas.createdAt,
    false,
    offerGas.id,
  );
  notifications.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

  // ── Chat ────────────────────────────────────────────────────────────────
  const chatThreads: ChatThread[] = [];
  const chatMessages: ChatMessage[] = [];
  const thread = (
    b: Booking,
    messages: [sender: ChatMessage['sender'], text: string, at: number][],
    unread: { customer: number; technician: number },
  ) => {
    if (!b.technicianId) return;
    const id = `cht-${b.id}`;
    messages.forEach(([sender, text, at], i) =>
      chatMessages.push({ id: `${id}-m${i + 1}`, threadId: id, sender, text, createdAt: iso(at) }),
    );
    const last = messages[messages.length - 1];
    chatThreads.push({
      id,
      bookingId: b.id,
      customerId: b.customerId,
      technicianId: b.technicianId,
      lastMessageAt: iso(last ? last[2] : toMs(b.createdAt)),
      lastMessagePreview: last?.[1] ?? '',
      unreadForCustomer: unread.customer,
      unreadForTechnician: unread.technician,
    });
  };
  thread(
    live,
    [
      [
        'system',
        `Chat opened for booking ${live.reference}.`,
        toMs(live.createdAt) + 15 * MINUTE_MS,
      ],
      [
        'technician',
        "Good day! I've set off and will reach you in about 25 minutes.",
        nowMs - 7 * MINUTE_MS,
      ],
      [
        'customer',
        'Perfect, thank you. Please call when you reach the gate.',
        nowMs - 5 * MINUTE_MS,
      ],
      ['technician', 'Sure, I will call you. See you soon.', nowMs - 4 * MINUTE_MS],
    ],
    { customer: 1, technician: 0 },
  );
  thread(
    pest,
    [
      [
        'system',
        `Chat opened for booking ${pest.reference}.`,
        toMs(pest.createdAt) + 26 * MINUTE_MS,
      ],
      [
        'technician',
        'Hello, this is Anil. Please keep pets and food items in a closed room during the treatment.',
        nowMs - 70 * MINUTE_MS,
      ],
    ],
    { customer: 1, technician: 0 },
  );
  const leakDone = toMs(completedAt(leak) ?? leak.updatedAt);
  thread(
    leak,
    [
      [
        'system',
        `Chat opened for booking ${leak.reference}.`,
        toMs(leak.createdAt) + 20 * MINUTE_MS,
      ],
      [
        'customer',
        'The water stain is on the ceiling below the upstairs bathroom.',
        toMs(leak.scheduledStart) - 60 * MINUTE_MS,
      ],
      [
        'technician',
        'Understood. I will bring the thermal camera.',
        toMs(leak.scheduledStart) - 50 * MINUTE_MS,
      ],
      [
        'technician',
        'All done — the joint is replaced and tested. Please let the ceiling dry for two days before painting.',
        leakDone + 5 * MINUTE_MS,
      ],
      ['customer', 'Thank you Hassan, excellent work.', leakDone + 30 * MINUTE_MS],
    ],
    { customer: 0, technician: 0 },
  );
  thread(
    later,
    [
      [
        'system',
        `Chat opened for booking ${later.reference}.`,
        toMs(later.createdAt) + 10 * MINUTE_MS,
      ],
      [
        'customer',
        'Hi, the AC in the master bedroom is leaking water. The unit is above the wardrobe.',
        nowMs - 3 * HOUR_MS,
      ],
    ],
    { customer: 0, technician: 1 },
  );

  // ── Support tickets ─────────────────────────────────────────────────────
  const requesters: [
    role: 'customer' | 'technician',
    id: string,
    status: SupportTicket['status'],
    ageDays: number,
  ][] = [
    ['customer', 'cus-01', 'resolved', 14],
    ['customer', 'cus-07', 'in_progress', 0.1],
    ['customer', 'cus-09', 'open', 0.3],
    ['customer', 'cus-10', 'in_progress', 2],
    ['customer', 'cus-06', 'open', 1],
    ['customer', 'cus-05', 'closed', 20],
    ['technician', 'tec-04', 'resolved', 5],
  ];
  const tickets: SupportTicket[] = ticketTemplates.map((template, i) => {
    const [role, requesterId, status, ageDays] = required(requesters[i], `ticket requester ${i}`);
    const createdAt = nowMs - ageDays * DAY_MS;
    const messages: SupportTicket['messages'] = [
      {
        id: `tkt-${i + 1}-m1`,
        from: 'requester',
        text: template.message,
        createdAt: iso(createdAt),
      },
    ];
    if (template.agentReply && status !== 'open') {
      messages.push({
        id: `tkt-${i + 1}-m2`,
        from: 'agent',
        text: template.agentReply,
        createdAt: iso(createdAt + 40 * MINUTE_MS),
      });
    }
    return {
      id: `tkt-${i + 1}`,
      reference: `T-${10_421 + i}`,
      requesterRole: role,
      requesterId,
      subject: template.subject,
      category: template.category,
      priority: template.priority,
      status,
      ...(requesterId === 'cus-01' ? { bookingId: cancelled.id } : {}),
      messages,
      createdAt: iso(createdAt),
      updatedAt: messages[messages.length - 1]?.createdAt ?? iso(createdAt),
    };
  });

  return {
    version: 1,
    seededAt: iso(nowMs),
    customers,
    vendors,
    technicians,
    admins: adminSeeds.map((a) => ({ ...a })),
    categories: cloneDeep(categories),
    services,
    promotions,
    coupons,
    bookings,
    reviews,
    notifications,
    chatThreads,
    chatMessages,
    walletTransactions,
    payouts,
    tickets,
    otpRequests: [],
    session: null,
    autoConfirmQueue: [],
    sequence: 1_000,
  };
}

function required<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`Seed: missing ${what}`);
  return value;
}
