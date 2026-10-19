import type {
  AdminApi,
  AdminBookingQuery,
  CustomerRow,
  TechnicianRow,
  VendorRow,
} from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { canTransition, isLiveStatus } from '../../domain/bookingStatus';
import { addDaysToLocalDate, DAY_MS, kuwaitDateOf, toMs } from '../../domain/time';
import { normalizeKuwaitPhone } from '../../format/phone';
import { searchScore } from '../../text/search';
import {
  type Booking,
  type BookingStatus,
  type Customer,
  mediaKeys,
  type Paginated,
  type Technician,
  type Vendor,
} from '../../types';
import {
  commissionRateFor,
  conflict,
  findBooking,
  findCategory,
  findCoupon,
  findCustomer,
  findPayout,
  findReview,
  findService,
  findTechnician,
  findTicket,
  findVendor,
  type MockContext,
  notify,
  recomputeRatings,
  requireSession,
  touch,
  validation,
} from './context';
import {
  canTake,
  cancelBooking,
  confirmBooking,
  eligibleTechnicians,
  settlePayment,
} from './dispatch';
import type { Runner } from './runner';
import { bookingView, reviewView, technicianSummary } from './views';

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const size = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const current = Math.max(1, Math.floor(page));
  return {
    items: items.slice((current - 1) * size, current * size),
    total: items.length,
    page: current,
    pageSize: size,
  };
}

export function createAdminApi(ctx: MockContext, run: Runner): AdminApi {
  const admin = () => requireSession(ctx, 'admin');
  const completedAt = (b: Booking) => b.timeline.filter((e) => e.type === 'completed').pop()?.at;
  const revenueDate = (b: Booking) => kuwaitDateOf(completedAt(b) ?? b.scheduledStart);

  const customerRow = (c: Customer): CustomerRow => {
    const own = ctx.state.bookings.filter((b) => b.customerId === c.id);
    const last = own.reduce<string | null>(
      (m, b) => (!m || toMs(b.createdAt) > toMs(m) ? b.createdAt : m),
      null,
    );
    return {
      ...c,
      bookingsCount: own.filter((b) => b.status !== 'cancelled').length,
      totalSpent: own
        .filter((b) => b.status === 'completed')
        .reduce((s, b) => s + b.price.total, 0),
      lastBookingAt: last,
    };
  };

  const technicianRow = (t: Technician): TechnicianRow => ({
    ...t,
    vendorName: t.vendorId
      ? (ctx.state.vendors.find((v) => v.id === t.vendorId)?.name ?? null)
      : null,
  });

  const vendorRow = (v: Vendor): VendorRow => {
    const techIds = new Set(
      ctx.state.technicians.filter((t) => t.vendorId === v.id).map((t) => t.id),
    );
    const completed = ctx.state.bookings.filter(
      (b) => b.vendorId === v.id && b.status === 'completed',
    );
    const ratings = ctx.state.reviews.filter(
      (r) => techIds.has(r.technicianId) && r.status === 'published',
    );
    return {
      ...v,
      techniciansCount: techIds.size,
      jobsCompleted: completed.length,
      revenue: completed.reduce((s, b) => s + b.price.total, 0),
      rating: ratings.length
        ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 100) / 100
        : 0,
    };
  };

  const filterBookings = (query: AdminBookingQuery) => {
    const statuses = query.status?.length ? new Set(query.status) : null;
    return ctx.state.bookings.filter((b) => {
      if (statuses && !statuses.has(b.status)) return false;
      if (query.categoryId && b.categoryId !== query.categoryId) return false;
      if (query.vendorId && b.vendorId !== query.vendorId) return false;
      if (query.technicianId && b.technicianId !== query.technicianId) return false;
      if (query.customerId && b.customerId !== query.customerId) return false;
      const date = kuwaitDateOf(b.scheduledStart);
      if (query.from && date < query.from) return false;
      if (query.to && date > query.to) return false;
      if (query.search?.trim()) {
        const customer = ctx.state.customers.find((c) => c.id === b.customerId);
        const technician = ctx.state.technicians.find((t) => t.id === b.technicianId);
        const service = ctx.state.services.find((s) => s.id === b.serviceId);
        const score = searchScore(query.search, [
          b.reference,
          `${customer?.fullName ?? ''} ${customer?.phone ?? ''}`,
          `${technician?.fullName.en ?? ''} ${technician?.fullName.ar ?? ''}`,
          `${service?.name.en ?? ''} ${service?.name.ar ?? ''}`,
        ]);
        if (!score) return false;
      }
      return true;
    });
  };

  const sorters: Record<
    NonNullable<AdminBookingQuery['sort']>,
    (a: Booking, b: Booking) => number
  > = {
    scheduled_desc: (a, b) => toMs(b.scheduledStart) - toMs(a.scheduledStart),
    scheduled_asc: (a, b) => toMs(a.scheduledStart) - toMs(b.scheduledStart),
    created_desc: (a, b) => toMs(b.createdAt) - toMs(a.createdAt),
    total_desc: (a, b) => b.price.total - a.price.total,
  };

  return {
    getProfile: () =>
      run.read(() => {
        const { userId } = admin();
        const found = ctx.state.admins.find((a) => a.id === userId);
        if (!found) throw new ApiError('UNAUTHORIZED', 'Account not found.');
        const { password: _password, ...profile } = found;
        return profile;
      }),

    getDashboard: () =>
      run.read(() => {
        admin();
        const today = kuwaitDateOf(ctx.now());
        const month = today.slice(0, 7);
        const previousMonth = addDaysToLocalDate(`${month}-01`, -1).slice(0, 7);
        const thirtyDaysAgo = addDaysToLocalDate(today, -29);
        const bookings = ctx.state.bookings;
        const completed = bookings.filter((b) => b.status === 'completed');
        const sumRevenue = (list: Booking[]) => list.reduce((s, b) => s + b.price.total, 0);
        const recent = bookings.filter(
          (b) =>
            kuwaitDateOf(b.scheduledStart) >= thirtyDaysAgo && toMs(b.scheduledStart) <= ctx.now(),
        );
        const recentClosed = recent.filter(
          (b) => b.status === 'completed' || b.status === 'cancelled',
        );
        const recentCompleted = completed.filter((b) => revenueDate(b) >= thirtyDaysAgo);
        const published = ctx.state.reviews.filter((r) => r.status === 'published');

        const revenueSeries = Array.from({ length: 30 }, (_, i) => {
          const date = addDaysToLocalDate(thirtyDaysAgo, i);
          return {
            date,
            revenue: sumRevenue(completed.filter((b) => revenueDate(b) === date)),
            bookings: bookings.filter(
              (b) => b.status !== 'cancelled' && kuwaitDateOf(b.scheduledStart) === date,
            ).length,
          };
        });

        const byCategory = ctx.state.categories
          .map((c) => {
            const own = recentCompleted.filter((b) => b.categoryId === c.id);
            return {
              categoryId: c.id,
              name: c.name,
              bookings: own.length,
              revenue: sumRevenue(own),
            };
          })
          .sort((a, b) => b.revenue - a.revenue);

        const byStatus = Object.fromEntries(
          ALL_STATUSES.map((s) => [s, bookings.filter((b) => b.status === s).length]),
        ) as Record<BookingStatus, number>;

        const topTechnicians = ctx.state.technicians
          .map((t) => {
            const own = recentCompleted.filter((b) => b.technicianId === t.id);
            return {
              technician: technicianSummary(ctx, t),
              jobs: own.length,
              revenue: sumRevenue(own),
            };
          })
          .filter((r) => r.jobs > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        const activeTechnicians = ctx.state.technicians.filter((t) => t.status === 'active');
        const monthCompleted = completed.filter((b) => revenueDate(b).startsWith(month));
        const onJob = new Set(
          bookings.filter((b) => isLiveStatus(b.status)).map((b) => b.technicianId),
        );
        const in24h = ctx.now() + DAY_MS;
        const in30d = ctx.now() + 30 * DAY_MS;
        return {
          alerts: {
            unassignedSoon: bookings.filter(
              (b) =>
                b.status === 'pending' &&
                toMs(b.scheduledStart) >= ctx.now() &&
                toMs(b.scheduledStart) <= in24h,
            ).length,
            pendingExtraCharges: bookings.filter((b) =>
              b.extraCharges.some((x) => x.status === 'pending_approval'),
            ).length,
            openTickets: ctx.state.tickets.filter(
              (t) => t.status === 'open' || t.status === 'in_progress',
            ).length,
            flaggedReviews: ctx.state.reviews.filter((r) => r.status === 'flagged').length,
            documentsExpiring: activeTechnicians.reduce(
              (n, t) =>
                n +
                t.documents.filter(
                  (d) =>
                    d.status === 'expired' ||
                    (d.expiresAt !== undefined && toMs(d.expiresAt) <= in30d),
                ).length,
              0,
            ),
            payoutsDue: ctx.state.payouts.filter(
              (p) => p.status !== 'paid' && toMs(p.periodEnd) <= ctx.now(),
            ).length,
          },
          kpis: {
            revenueToday: sumRevenue(completed.filter((b) => revenueDate(b) === today)),
            revenueMonth: sumRevenue(completed.filter((b) => revenueDate(b).startsWith(month))),
            revenuePreviousMonth: sumRevenue(
              completed.filter((b) => revenueDate(b).startsWith(previousMonth)),
            ),
            bookingsToday: bookings.filter(
              (b) => b.status !== 'cancelled' && kuwaitDateOf(b.scheduledStart) === today,
            ).length,
            bookingsMonth: bookings.filter(
              (b) => b.status !== 'cancelled' && kuwaitDateOf(b.scheduledStart).startsWith(month),
            ).length,
            activeTechnicians: activeTechnicians.length,
            onlineTechnicians: activeTechnicians.filter((t) => t.isOnline).length,
            pendingApprovals:
              ctx.state.technicians.filter((t) => t.status === 'pending_approval').length +
              ctx.state.vendors.filter((v) => v.status === 'pending_approval').length,
            averageRating: published.length
              ? Math.round((published.reduce((s, r) => s + r.rating, 0) / published.length) * 100) /
                100
              : 0,
            completionRate: recentClosed.length
              ? recentClosed.filter((b) => b.status === 'completed').length / recentClosed.length
              : 1,
            cancellationRate: recentClosed.length
              ? recentClosed.filter((b) => b.status === 'cancelled').length / recentClosed.length
              : 0,
            customers: ctx.state.customers.length,
            technicians: ctx.state.technicians.length,
            vendors: ctx.state.vendors.length,
            bookingsTotal: bookings.length,
            activeBookings: bookings.filter(
              (b) => b.status === 'confirmed' || isLiveStatus(b.status),
            ).length,
            platformFeesMonth: monthCompleted.reduce(
              (s, b) => s + Math.round(b.price.total * commissionRateFor(ctx, b.technicianId)),
              0,
            ),
            techniciansOnJob: activeTechnicians.filter((t) => onJob.has(t.id)).length,
            reviewsCount: published.length,
            satisfactionRate: published.length
              ? published.filter((r) => r.rating >= 4).length / published.length
              : 0,
          },
          revenueSeries,
          byCategory,
          byStatus,
          topTechnicians,
          recentBookings: [...bookings]
            .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
            .slice(0, 8)
            .map((b) => bookingView(ctx, b)),
        };
      }),

    listBookings: (query = {}) =>
      run.read(() => {
        admin();
        const list = filterBookings(query).sort(sorters[query.sort ?? 'scheduled_desc']);
        const page = paginate(list, query.page, query.pageSize);
        return { ...page, items: page.items.map((b) => bookingView(ctx, b)) };
      }),

    getBooking: (id) =>
      run.read(() => {
        admin();
        return bookingView(ctx, findBooking(ctx, id));
      }),

    listEligibleTechnicians: (bookingId) =>
      run.read(() => {
        admin();
        const booking = findBooking(ctx, bookingId);
        return eligibleTechnicians(ctx, booking.categoryId, booking.address.areaId)
          .map((t) => ({
            technician: technicianSummary(ctx, t),
            isFree: canTake(ctx, t, booking),
            isOnline: t.isOnline,
          }))
          .sort(
            (a, b) =>
              Number(b.isFree) - Number(a.isFree) || b.technician.rating - a.technician.rating,
          );
      }),

    assignTechnician: (bookingId, technicianId) =>
      run.write(() => {
        admin();
        const booking = findBooking(ctx, bookingId);
        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
          conflict('Technicians can only be assigned before the visit starts.');
        }
        const technician = findTechnician(ctx, technicianId);
        const eligible = eligibleTechnicians(ctx, booking.categoryId, booking.address.areaId).some(
          (t) => t.id === technicianId,
        );
        if (!eligible) validation('This technician does not cover this service or area.');
        if (booking.technicianId === technicianId) return bookingView(ctx, booking);
        if (!canTake(ctx, technician, booking))
          conflict('This technician is not free at the scheduled time.');
        confirmBooking(ctx, booking, technician, 'admin');
        return bookingView(ctx, booking);
      }),

    updateBookingStatus: (bookingId, status, note) =>
      run.write(() => {
        admin();
        const booking = findBooking(ctx, bookingId);
        if (!canTransition(booking.status, status, 'admin')) {
          conflict(`A booking cannot move from ${booking.status} to ${status}.`);
        }
        if (status === 'pending') conflict('Bookings cannot be returned to pending.');
        if (status === 'confirmed') validation('Assign a technician to confirm a booking.');
        if (status === 'cancelled') {
          cancelBooking(ctx, booking, 'admin', note?.trim() || 'Cancelled by operations', 0);
          return bookingView(ctx, booking);
        }
        if (
          status === 'completed' &&
          booking.extraCharges.some((x) => x.status === 'pending_approval')
        ) {
          conflict('An extra charge is still awaiting the customer’s approval.');
        }
        booking.status = status;
        booking.timeline.push({
          type: status,
          at: ctx.nowISO(),
          actor: 'admin',
          ...(note ? { note } : {}),
        });
        if (status === 'completed') {
          settlePayment(ctx, booking);
          const t = ctx.state.technicians.find((x) => x.id === booking.technicianId);
          if (t) t.jobsCompleted += 1;
        }
        touch(ctx, booking);
        notify(
          ctx,
          'customer',
          booking.customerId,
          'booking_update',
          { en: 'Booking updated', ar: 'تم تحديث الحجز' },
          {
            en: `${booking.reference} status changed by our team.`,
            ar: `قام فريقنا بتحديث حالة ${booking.reference}.`,
          },
          booking.id,
        );
        return bookingView(ctx, booking);
      }),

    listCustomers: (query = {}) =>
      run.read(() => {
        admin();
        const rows = ctx.state.customers
          .filter(
            (c) =>
              !query.search?.trim() ||
              searchScore(query.search, [`${c.fullName} ${c.phone} ${c.email ?? ''}`]) > 0,
          )
          .map(customerRow)
          .sort(
            (a, b) => toMs(b.lastBookingAt ?? b.createdAt) - toMs(a.lastBookingAt ?? a.createdAt),
          );
        return paginate(rows, query.page, query.pageSize);
      }),

    getCustomer: (id) =>
      run.read(() => {
        admin();
        return customerRow(findCustomer(ctx, id));
      }),

    setCustomerStatus: (id, status) =>
      run.write(() => {
        admin();
        const customer = findCustomer(ctx, id);
        customer.status = status;
        if (
          status === 'blocked' &&
          ctx.state.session?.role === 'customer' &&
          ctx.state.session.userId === id
        ) {
          ctx.state.session = null;
        }
        return customerRow(customer);
      }),

    listTechnicians: (query = {}) =>
      run.read(() => {
        admin();
        const order = { pending_approval: 0, active: 1, suspended: 2 } as const;
        const rows = ctx.state.technicians
          .filter((t) => (query.status ? t.status === query.status : true))
          .filter((t) =>
            query.vendorId === 'independent'
              ? t.vendorId === null
              : query.vendorId
                ? t.vendorId === query.vendorId
                : true,
          )
          .filter((t) => (query.categoryId ? t.categoryIds.includes(query.categoryId) : true))
          .filter(
            (t) =>
              !query.search?.trim() ||
              searchScore(query.search, [`${t.fullName.en} ${t.fullName.ar} ${t.phone}`]) > 0,
          )
          .sort(
            (a, b) =>
              order[a.status] - order[b.status] || a.fullName.en.localeCompare(b.fullName.en),
          )
          .map(technicianRow);
        return paginate(rows, query.page, query.pageSize);
      }),

    getTechnician: (id) =>
      run.read(() => {
        admin();
        return technicianRow(findTechnician(ctx, id));
      }),

    setTechnicianStatus: (id, status) =>
      run.write(() => {
        admin();
        const technician = findTechnician(ctx, id);
        if (status === 'active') {
          const unverified = technician.documents.filter((d) => d.status !== 'verified');
          if (unverified.length) {
            validation('All documents must be verified before approval.', {
              documents: unverified.map((d) => d.id),
            });
          }
          if (
            technician.vendorId &&
            ctx.state.vendors.find((v) => v.id === technician.vendorId)?.status !== 'active'
          ) {
            validation('The technician’s company must be active first.');
          }
        }
        technician.status = status;
        if (status !== 'active') technician.isOnline = false;
        notify(
          ctx,
          'technician',
          technician.id,
          'system',
          status === 'active'
            ? { en: 'Account approved', ar: 'تمت الموافقة على حسابك' }
            : { en: 'Account status changed', ar: 'تم تغيير حالة الحساب' },
          status === 'active'
            ? {
                en: 'You can now go online and receive jobs.',
                ar: 'يمكنك الآن الاتصال واستقبال المهام.',
              }
            : {
                en: 'Please contact the operations team for details.',
                ar: 'يرجى التواصل مع فريق العمليات للتفاصيل.',
              },
        );
        return technicianRow(technician);
      }),

    reviewTechnicianDocument: (technicianId, documentId, status) =>
      run.write(() => {
        admin();
        const technician = findTechnician(ctx, technicianId);
        const document = technician.documents.find((d) => d.id === documentId);
        if (!document) throw new ApiError('NOT_FOUND', 'Document not found.');
        document.status = status;
        return technicianRow(technician);
      }),

    listVendors: () =>
      run.read(() => {
        admin();
        return ctx.state.vendors.map(vendorRow).sort((a, b) => b.revenue - a.revenue);
      }),

    getVendor: (id) =>
      run.read(() => {
        admin();
        return vendorRow(findVendor(ctx, id));
      }),

    createVendor: (input) =>
      run.write(() => {
        admin();
        const vendor: Vendor = {
          ...validateVendor(ctx, input),
          id: ctx.nextId('ven'),
          status: 'pending_approval',
          joinedAt: ctx.nowISO(),
        };
        ctx.state.vendors.push(vendor);
        return vendorRow(vendor);
      }),

    updateVendor: (id, patch) =>
      run.write(() => {
        admin();
        const vendor = findVendor(ctx, id);
        Object.assign(vendor, validateVendor(ctx, { ...vendor, ...patch }));
        return vendorRow(vendor);
      }),

    setVendorStatus: (id, status) =>
      run.write(() => {
        admin();
        const vendor = findVendor(ctx, id);
        vendor.status = status;
        if (status !== 'active') {
          ctx.state.technicians
            .filter((t) => t.vendorId === id)
            .forEach((t) => (t.isOnline = false));
        }
        return vendorRow(vendor);
      }),

    listCategories: () =>
      run.read(() => {
        admin();
        return [...ctx.state.categories].sort((a, b) => a.sortOrder - b.sortOrder);
      }),

    updateCategory: (id, patch) =>
      run.write(() => {
        admin();
        const category = findCategory(ctx, id);
        if (patch.name && (!patch.name.en.trim() || !patch.name.ar.trim()))
          validation('Name is required in English and Arabic.');
        Object.assign(category, patch);
        return category;
      }),

    listServices: (filter = {}) =>
      run.read(() => {
        admin();
        return ctx.state.services
          .filter((s) => (filter.categoryId ? s.categoryId === filter.categoryId : true))
          .filter(
            (s) =>
              !filter.search?.trim() ||
              searchScore(filter.search, [`${s.name.en} ${s.name.ar}`]) > 0,
          );
      }),

    updateService: (id, patch) =>
      run.write(() => {
        admin();
        const service = findService(ctx, id);
        if (
          patch.basePrice !== undefined &&
          (!Number.isInteger(patch.basePrice) || patch.basePrice <= 0)
        ) {
          validation('Price must be a positive amount.');
        }
        if (patch.name && (!patch.name.en.trim() || !patch.name.ar.trim()))
          validation('Name is required in English and Arabic.');
        if (
          patch.shortDescription &&
          (!patch.shortDescription.en.trim() || !patch.shortDescription.ar.trim())
        ) {
          validation('Summary is required in English and Arabic.');
        }
        if (patch.image !== undefined && !(mediaKeys as readonly string[]).includes(patch.image))
          validation('Choose one of the licensed images.');
        Object.assign(service, patch);
        return service;
      }),

    updateServicePricing: (id, input) =>
      run.write(() => {
        admin();
        const service = findService(ctx, id);
        const isAmount = (v: number) => Number.isInteger(v);
        if (input.basePrice !== undefined && (!isAmount(input.basePrice) || input.basePrice <= 0))
          validation('Base price must be a positive amount.');
        const minUnits = input.minUnits ?? service.minUnits;
        const maxUnits = input.maxUnits ?? service.maxUnits;
        if (!Number.isInteger(minUnits) || !Number.isInteger(maxUnits) || minUnits < 1)
          validation('Units must be whole numbers from 1.');
        if (maxUnits < minUnits || maxUnits > 50)
          validation('Maximum units must be between the minimum and 50.');
        const choices = new Map(
          service.optionGroups.flatMap((g) => g.choices.map((c) => [c.id, c] as const)),
        );
        for (const [choiceId, delta] of Object.entries(input.optionPrices ?? {})) {
          if (!choices.has(choiceId)) validation('Unknown option.', { choiceId });
          if (!isAmount(delta)) validation('Enter a valid option price.');
        }
        // Options may lower the price (e.g. a smaller unit) but never to zero or below.
        const base = input.basePrice ?? service.basePrice;
        for (const choice of choices.values()) {
          const delta = input.optionPrices?.[choice.id] ?? choice.priceDelta;
          if (base + delta <= 0)
            validation('An option cannot reduce the price to zero or below.', {
              choiceId: choice.id,
            });
        }
        const addOns = new Map(service.addOns.map((a) => [a.id, a]));
        for (const [addOnId, price] of Object.entries(input.addOnPrices ?? {})) {
          if (!addOns.has(addOnId)) validation('Unknown add-on.', { addOnId });
          if (!isAmount(price) || price <= 0) validation('Add-on prices must be positive.');
        }
        if (input.basePrice !== undefined) service.basePrice = input.basePrice;
        service.minUnits = minUnits;
        service.maxUnits = maxUnits;
        for (const [choiceId, delta] of Object.entries(input.optionPrices ?? {}))
          choices.get(choiceId)!.priceDelta = delta;
        for (const [addOnId, price] of Object.entries(input.addOnPrices ?? {}))
          addOns.get(addOnId)!.price = price;
        return service;
      }),

    listCoupons: () =>
      run.read(() => {
        admin();
        return [...ctx.state.coupons].sort((a, b) => toMs(b.validUntil) - toMs(a.validUntil));
      }),

    saveCoupon: (input) =>
      run.write(() => {
        admin();
        const code = input.code.trim().toUpperCase();
        if (!/^[A-Z0-9]{3,20}$/.test(code)) validation('Codes use 3–20 letters or digits.');
        if (ctx.state.coupons.some((c) => c.code === code && c.id !== input.id))
          validation('This code already exists.');
        if (input.type === 'percent' && (input.value <= 0 || input.value > 100))
          validation('Percentage must be 1–100.');
        if (input.type === 'fixed' && (!Number.isInteger(input.value) || input.value <= 0))
          validation('Enter a valid amount.');
        if (toMs(input.validUntil) <= toMs(input.validFrom))
          validation('End date must be after the start date.');
        if (!Number.isInteger(input.minSubtotal) || input.minSubtotal < 0)
          validation('Enter a valid minimum order.');
        if (
          input.maxDiscount !== undefined &&
          (!Number.isInteger(input.maxDiscount) || input.maxDiscount <= 0)
        )
          validation('Enter a valid maximum discount.');
        if (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)
          validation('The usage limit must be at least 1.');
        if (!input.description.en.trim() || !input.description.ar.trim())
          validation('Add a description in English and Arabic.');
        if (input.categoryIds.some((id) => !ctx.state.categories.some((c) => c.id === id)))
          validation('Unknown category.');
        if (input.id) {
          const existing = findCoupon(ctx, input.id);
          Object.assign(existing, { ...input, code });
          return existing;
        }
        const coupon = { ...input, code, id: ctx.nextId('cpn'), usedCount: 0 };
        ctx.state.coupons.push(coupon);
        return coupon;
      }),

    setCouponActive: (id, isActive) =>
      run.write(() => {
        admin();
        const coupon = findCoupon(ctx, id);
        coupon.isActive = isActive;
        return coupon;
      }),

    listReviews: (query = {}) =>
      run.read(() => {
        admin();
        const rows = ctx.state.reviews
          .filter((r) => (query.status ? r.status === query.status : true))
          .filter((r) => (query.maxRating ? r.rating <= query.maxRating : true))
          .filter((r) => (query.customerId ? r.customerId === query.customerId : true))
          .filter((r) => (query.technicianId ? r.technicianId === query.technicianId : true))
          .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
          .map((r) => reviewView(ctx, r));
        return paginate(rows, query.page, query.pageSize);
      }),

    setReviewStatus: (id, status) =>
      run.write(() => {
        admin();
        const review = findReview(ctx, id);
        review.status = status;
        recomputeRatings(ctx, review.technicianId, review.serviceId);
        return reviewView(ctx, review);
      }),

    listPayouts: (query = {}) =>
      run.read(() => {
        admin();
        return ctx.state.payouts
          .filter((p) => (query.status ? p.status === query.status : true))
          .filter((p) => (query.payeeType ? p.payeeType === query.payeeType : true))
          .sort((a, b) => toMs(b.periodStart) - toMs(a.periodStart) || b.netAmount - a.netAmount)
          .map((p) => ({ ...p, payeeName: payeeName(ctx, p.payeeType, p.payeeId) }));
      }),

    markPayoutPaid: (id) =>
      run.write(() => {
        admin();
        const payout = findPayout(ctx, id);
        if (payout.status === 'paid') conflict('This payout has already been paid.');
        if (toMs(payout.periodEnd) > ctx.now()) conflict('The payout period has not ended yet.');
        payout.status = 'paid';
        payout.paidAt = ctx.nowISO();
        if (payout.payeeType === 'technician') {
          notify(
            ctx,
            'technician',
            payout.payeeId,
            'payment',
            { en: 'Payout sent', ar: 'تم تحويل المستحقات' },
            {
              en: 'Your weekly payout has been transferred (simulated).',
              ar: 'تم تحويل مستحقاتك الأسبوعية (محاكاة).',
            },
          );
        }
        return { ...payout, payeeName: payeeName(ctx, payout.payeeType, payout.payeeId) };
      }),

    listTickets: (query = {}) =>
      run.read(() => {
        admin();
        return ctx.state.tickets
          .filter((t) => (query.status ? t.status === query.status : true))
          .filter((t) => (query.requesterId ? t.requesterId === query.requesterId : true))
          .filter((t) => (query.bookingId ? t.bookingId === query.bookingId : true))
          .sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt))
          .map((t) => ({
            ...t,
            requesterName: requesterName(ctx, t.requesterRole, t.requesterId),
          }));
      }),

    getTicket: (id) =>
      run.read(() => {
        admin();
        const t = findTicket(ctx, id);
        return { ...t, requesterName: requesterName(ctx, t.requesterRole, t.requesterId) };
      }),

    replyToTicket: (id, text) =>
      run.write(() => {
        admin();
        const ticket = findTicket(ctx, id);
        const body = text.trim();
        if (!body) validation('Reply cannot be empty.');
        ticket.messages.push({
          id: ctx.nextId('tkm'),
          from: 'agent',
          text: body,
          createdAt: ctx.nowISO(),
        });
        if (ticket.status === 'open') ticket.status = 'in_progress';
        ticket.updatedAt = ctx.nowISO();
        notify(
          ctx,
          ticket.requesterRole,
          ticket.requesterId,
          'system',
          { en: 'Support replied', ar: 'رد فريق الدعم' },
          {
            en: `New reply on ${ticket.reference}: ${ticket.subject}`,
            ar: `رد جديد على ${ticket.reference}: ${ticket.subject}`,
          },
        );
        return {
          ...ticket,
          requesterName: requesterName(ctx, ticket.requesterRole, ticket.requesterId),
        };
      }),

    setTicketStatus: (id, status) =>
      run.write(() => {
        admin();
        const ticket = findTicket(ctx, id);
        ticket.status = status;
        ticket.updatedAt = ctx.nowISO();
        return {
          ...ticket,
          requesterName: requesterName(ctx, ticket.requesterRole, ticket.requesterId),
        };
      }),
  };
}

function validateVendor(ctx: MockContext, input: Parameters<AdminApi['createVendor']>[0]) {
  if (!input.name.en.trim() || !input.name.ar.trim())
    validation('Company name is required in English and Arabic.');
  if (!input.legalName.trim()) validation('Legal name is required.');
  if (!/^CR-\d{5,8}$/.test(input.crNumber.trim()))
    validation('Commercial registration must look like CR-123456.');
  if (!input.contactName.trim()) validation('Contact name is required.');
  const phone = normalizeKuwaitPhone(input.phone);
  if (!phone) validation('Enter a valid Kuwaiti phone number.');
  if (!EMAIL_PATTERN.test(input.email.trim())) validation('Enter a valid email address.');
  if (!input.categoryIds.length) validation('Select at least one service category.');
  if (input.categoryIds.some((id) => !ctx.state.categories.some((c) => c.id === id)))
    validation('Unknown category.');
  if (!input.governorateIds.length) validation('Select at least one governorate.');
  if (input.commissionRate < 0 || input.commissionRate > 0.5)
    validation('Commission must be between 0% and 50%.');
  return {
    name: { en: input.name.en.trim(), ar: input.name.ar.trim() },
    legalName: input.legalName.trim(),
    crNumber: input.crNumber.trim(),
    contactName: input.contactName.trim(),
    phone: phone as string,
    email: input.email.trim(),
    categoryIds: [...input.categoryIds],
    governorateIds: [...input.governorateIds],
    commissionRate: input.commissionRate,
  };
}

function payeeName(ctx: MockContext, type: 'technician' | 'vendor', id: string) {
  if (type === 'vendor')
    return ctx.state.vendors.find((v) => v.id === id)?.name ?? { en: id, ar: id };
  return ctx.state.technicians.find((t) => t.id === id)?.fullName ?? { en: id, ar: id };
}

function requesterName(ctx: MockContext, role: 'customer' | 'technician', id: string): string {
  if (role === 'customer') return ctx.state.customers.find((c) => c.id === id)?.fullName ?? id;
  return ctx.state.technicians.find((t) => t.id === id)?.fullName.en ?? id;
}
