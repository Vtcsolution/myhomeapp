import type {
  BookingScope,
  CouponResult,
  CustomerAccountApi,
  CustomerBookingsApi,
  QuoteRequest,
  TrackingInfo,
} from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { isCustomerCancellable, isLiveStatus, isUpcomingStatus } from '../../domain/bookingStatus';
import {
  calculatePrice,
  evaluateCoupon,
  validateSelections,
  withExtraCharges,
} from '../../domain/pricing';
import { bookableDates, computeSlots } from '../../domain/schedule';
import { kuwaitDateOf, MINUTE_MS, toMs } from '../../domain/time';
import { formatMoney } from '../../format/money';
import { getArea } from '../../geo/kuwait';
import type {
  Address,
  Booking,
  BookingSelections,
  Coupon,
  Customer,
  LocalDate,
  Service,
} from '../../types';
import { hashString } from '../random';
import {
  cancellationFeeFor,
  canReschedule,
  currentCustomer,
  findBooking,
  findService,
  type MockContext,
  notify,
  recomputeRatings,
  requireSession,
  simulatedReference,
  touch,
  validation,
  conflict,
} from './context';
import { canTake, cancelBooking, eligibleTechnicians, offerToTechnicians } from './dispatch';
import type { Runner } from './runner';
import { bookingView } from './views';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ARABIC_PATTERN = /[\u0600-\u06FF]/;

export function createCustomerBookingsApi(ctx: MockContext, run: Runner): CustomerBookingsApi {
  const activeService = (id: string): Service => {
    const service = findService(ctx, id);
    if (!service.isActive)
      throw new ApiError('NOT_FOUND', 'This service is currently unavailable.');
    return service;
  };

  const assertSelections = (service: Service, selections: BookingSelections) => {
    const issues = validateSelections(service, selections);
    if (issues.length) validation('Please review your service options.', issues);
  };

  const ownBooking = (customer: Customer, id: string): Booking => {
    const booking = findBooking(ctx, id);
    if (booking.customerId !== customer.id) throw new ApiError('NOT_FOUND', 'Booking not found.');
    return booking;
  };

  const ownAddress = (customer: Customer, id: string): Address => {
    const address = customer.addresses.find((a) => a.id === id);
    if (!address) throw new ApiError('NOT_FOUND', 'Address not found.');
    return address;
  };

  const previousBookings = (customerId: string) =>
    ctx.state.bookings.filter((b) => b.customerId === customerId && b.status !== 'cancelled')
      .length;

  const resolveCoupon = (
    code: string | undefined,
    service: Service,
    selections: BookingSelections,
    customerId: string | null,
  ): { coupon: Coupon | null; result?: CouponResult } => {
    if (!code?.trim()) return { coupon: null };
    const normalized = code.trim().toUpperCase();
    const coupon = ctx.state.coupons.find((c) => c.code === normalized);
    if (!coupon)
      return {
        coupon: null,
        result: { code: normalized, status: 'rejected', reason: 'not_found' },
      };
    const base = calculatePrice({ service, selections });
    const evaluation = evaluateCoupon(coupon, {
      subtotal: base.subtotal,
      categoryId: service.categoryId,
      now: ctx.nowISO(),
      previousBookings: customerId ? previousBookings(customerId) : 0,
    });
    return evaluation.ok
      ? { coupon, result: { code: normalized, status: 'applied', discount: evaluation.discount } }
      : {
          coupon: null,
          result: { code: normalized, status: 'rejected', reason: evaluation.reason },
        };
  };

  const slotsFor = (
    service: Service,
    selections: BookingSelections,
    areaId: string,
    date: LocalDate,
    ignoreBookingId?: string,
  ) =>
    computeSlots({
      date,
      now: ctx.nowISO(),
      durationMin: calculatePrice({ service, selections }).estimatedDurationMin,
      technicians: eligibleTechnicians(ctx, service.categoryId, areaId),
      bookings: ctx.state.bookings,
      ...(ignoreBookingId ? { ignoreBookingId } : {}),
    });

  const quote = (request: QuoteRequest) => {
    const service = activeService(request.serviceId);
    assertSelections(service, request.selections);
    const session = ctx.state.session;
    const customerId = session?.role === 'customer' ? session.userId : null;
    const { coupon, result } = resolveCoupon(
      request.couponCode,
      service,
      request.selections,
      customerId,
    );
    return {
      price: calculatePrice({ service, selections: request.selections, coupon }),
      ...(result ? { coupon: result } : {}),
    };
  };

  const scopeFilter: Record<BookingScope, (b: Booking) => boolean> = {
    upcoming: (b) => isUpcomingStatus(b.status),
    active: (b) => isLiveStatus(b.status),
    past: (b) => b.status === 'completed' || b.status === 'cancelled',
    all: () => true,
  };

  return {
    getQuote: (request) => run.read(() => quote(request)),

    getBookableDates: () => run.read(() => bookableDates(ctx.nowISO())),

    getAvailableSlots: ({ serviceId, selections, addressId, date }) =>
      run.read(() => {
        const customer = currentCustomer(ctx);
        const service = activeService(serviceId);
        assertSelections(service, selections);
        const address = ownAddress(customer, addressId);
        return slotsFor(service, selections, address.areaId, date);
      }),

    create: (request) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        if (!customer.fullName.trim()) validation('Please complete your profile before booking.');
        const service = activeService(request.serviceId);
        assertSelections(service, request.selections);
        const address = ownAddress(customer, request.addressId);

        const slotStartMs = toMs(request.slotStart);
        const slot = slotsFor(
          service,
          request.selections,
          address.areaId,
          kuwaitDateOf(slotStartMs),
        ).find((s) => toMs(s.start) === slotStartMs);
        if (!slot?.available) {
          throw new ApiError(
            'SLOT_UNAVAILABLE',
            'This time is no longer available. Please choose another.',
          );
        }

        const { coupon, result } = resolveCoupon(
          request.couponCode,
          service,
          request.selections,
          customer.id,
        );
        if (result?.status === 'rejected') {
          throw new ApiError('COUPON_INVALID', 'This promo code cannot be applied.', result);
        }
        const price = calculatePrice({ service, selections: request.selections, coupon });

        const id = ctx.nextId('bkg');
        const maxRef = ctx.state.bookings.reduce(
          (m, b) => Math.max(m, Number(b.reference.slice(3)) || 0),
          48_212,
        );
        const reference = `MH-${maxRef + 1}`;
        const prepaid = request.paymentMethod !== 'cash';

        if (request.paymentMethod === 'wallet') {
          if (customer.walletBalance < price.total) {
            throw new ApiError(
              'INSUFFICIENT_FUNDS',
              'Your wallet balance is not enough for this booking.',
            );
          }
          customer.walletBalance -= price.total;
          ctx.state.walletTransactions.unshift({
            id: ctx.nextId('wtx'),
            customerId: customer.id,
            type: 'payment',
            amount: -price.total,
            description: { en: `Payment for ${reference}`, ar: `دفع الحجز ${reference}` },
            bookingId: id,
            createdAt: ctx.nowISO(),
          });
        }
        if (coupon) coupon.usedCount += 1;

        const booking: Booking = {
          id,
          reference,
          customerId: customer.id,
          serviceId: service.id,
          categoryId: service.categoryId,
          selections: request.selections,
          address: { ...address },
          scheduledStart: slot.start,
          scheduledEnd: slot.end,
          status: 'pending',
          technicianId: null,
          vendorId: null,
          offeredTo: [],
          declinedBy: [],
          price,
          payment: {
            method: request.paymentMethod,
            status: prepaid ? 'paid' : 'unpaid',
            paidAmount: prepaid ? price.total : 0,
            refundedAmount: 0,
            ...(prepaid ? { reference: simulatedReference(), paidAt: ctx.nowISO() } : {}),
          },
          extraCharges: [],
          ...(request.notes?.trim() ? { customerNotes: request.notes.trim().slice(0, 500) } : {}),
          timeline: [{ type: 'created', at: ctx.nowISO(), actor: 'customer' }],
          createdAt: ctx.nowISO(),
          updatedAt: ctx.nowISO(),
        };
        ctx.state.bookings.push(booking);
        offerToTechnicians(ctx, booking);
        ctx.state.autoConfirmQueue.push(booking.id);

        notify(
          ctx,
          'customer',
          customer.id,
          'booking_update',
          { en: 'Booking received', ar: 'تم استلام الحجز' },
          {
            en: `We're matching the best available professional for your ${service.name.en}.`,
            ar: `نعمل على اختيار أفضل محترف متاح لخدمة ${service.name.ar}.`,
          },
          booking.id,
        );
        return bookingView(ctx, booking);
      }),

    list: (scope = 'all') =>
      run.read(() => {
        const customer = currentCustomer(ctx);
        const ascending = scope === 'upcoming' || scope === 'active';
        return ctx.state.bookings
          .filter((b) => b.customerId === customer.id && scopeFilter[scope](b))
          .sort((a, b) => (toMs(a.scheduledStart) - toMs(b.scheduledStart)) * (ascending ? 1 : -1))
          .map((b) => bookingView(ctx, b));
      }),

    get: (id) => run.read(() => bookingView(ctx, ownBooking(currentCustomer(ctx), id))),

    cancel: (id, reason) =>
      run.write(() => {
        const booking = ownBooking(currentCustomer(ctx), id);
        if (!isCustomerCancellable(booking.status)) {
          conflict('This booking can no longer be cancelled. Please contact support.');
        }
        cancelBooking(
          ctx,
          booking,
          'customer',
          reason.trim() || 'No reason given',
          cancellationFeeFor(ctx, booking),
        );
        return bookingView(ctx, booking);
      }),

    getRescheduleSlots: (id, date) =>
      run.read(() => {
        const booking = ownBooking(currentCustomer(ctx), id);
        if (!canReschedule(ctx, booking)) conflict('This booking can no longer be rescheduled.');
        const service = findService(ctx, booking.serviceId);
        return slotsFor(service, booking.selections, booking.address.areaId, date, booking.id);
      }),

    reschedule: (id, slotStart) =>
      run.write(() => {
        const booking = ownBooking(currentCustomer(ctx), id);
        if (!canReschedule(ctx, booking)) {
          conflict(
            `Bookings can be rescheduled up to ${ctx.config.freeCancellationHours} hours before the visit.`,
          );
        }
        const service = findService(ctx, booking.serviceId);
        const startMs = toMs(slotStart);
        const slot = slotsFor(
          service,
          booking.selections,
          booking.address.areaId,
          kuwaitDateOf(startMs),
          booking.id,
        ).find((s) => toMs(s.start) === startMs);
        if (!slot?.available) {
          throw new ApiError(
            'SLOT_UNAVAILABLE',
            'This time is no longer available. Please choose another.',
          );
        }
        const previousStart = booking.scheduledStart;
        booking.scheduledStart = slot.start;
        booking.scheduledEnd = slot.end;
        booking.timeline.push({
          type: 'rescheduled',
          at: ctx.nowISO(),
          actor: 'customer',
          note: previousStart,
        });

        // Keep the technician if they are still free; otherwise re-match.
        const technician = booking.technicianId
          ? ctx.state.technicians.find((t) => t.id === booking.technicianId)
          : undefined;
        const stillFree =
          !!technician &&
          eligibleTechnicians(ctx, booking.categoryId, booking.address.areaId).some(
            (t) => t.id === technician.id,
          ) &&
          canTake(ctx, technician, booking);

        if (technician && stillFree) {
          notify(
            ctx,
            'technician',
            technician.id,
            'booking_update',
            { en: 'Job rescheduled', ar: 'تم تغيير موعد المهمة' },
            {
              en: `${booking.reference} has a new time.`,
              ar: `تم تحديد موعد جديد للمهمة ${booking.reference}.`,
            },
            booking.id,
          );
        } else {
          if (technician) {
            notify(
              ctx,
              'technician',
              technician.id,
              'booking_update',
              { en: 'Job reassigned', ar: 'تمت إعادة إسناد المهمة' },
              {
                en: `${booking.reference} was rescheduled to a time you are not available.`,
                ar: `تم تغيير موعد ${booking.reference} إلى وقت غير متاح لك.`,
              },
              booking.id,
            );
          }
          booking.status = 'pending';
          booking.technicianId = null;
          booking.vendorId = null;
          offerToTechnicians(ctx, booking);
          if (!ctx.state.autoConfirmQueue.includes(booking.id))
            ctx.state.autoConfirmQueue.push(booking.id);
        }
        touch(ctx, booking);
        return bookingView(ctx, booking);
      }),

    respondToExtraCharge: (bookingId, chargeId, approve) =>
      run.write(() => {
        const booking = ownBooking(currentCustomer(ctx), bookingId);
        const charge = booking.extraCharges.find((x) => x.id === chargeId);
        if (!charge) throw new ApiError('NOT_FOUND', 'Charge not found.');
        if (charge.status !== 'pending_approval')
          conflict('You have already responded to this charge.');
        charge.status = approve ? 'approved' : 'declined';
        charge.respondedAt = ctx.nowISO();
        booking.price = withExtraCharges(booking.price, booking.extraCharges, ctx.config);
        booking.timeline.push({
          type: approve ? 'extra_charge_approved' : 'extra_charge_declined',
          at: ctx.nowISO(),
          actor: 'customer',
          note: charge.description,
        });
        touch(ctx, booking);
        if (booking.technicianId) {
          notify(
            ctx,
            'technician',
            booking.technicianId,
            'booking_update',
            approve
              ? { en: 'Extra work approved', ar: 'تمت الموافقة على العمل الإضافي' }
              : { en: 'Extra work declined', ar: 'تم رفض العمل الإضافي' },
            {
              en: `${charge.description} — ${formatMoney(charge.amount)}`,
              ar: `${charge.description} — ${formatMoney(charge.amount, { locale: 'ar' })}`,
            },
            booking.id,
          );
        }
        return bookingView(ctx, booking);
      }),

    submitReview: (bookingId, input) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        const booking = ownBooking(customer, bookingId);
        if (booking.status !== 'completed' || !booking.technicianId)
          conflict('Only completed bookings can be reviewed.');
        if (booking.reviewId) conflict('You have already reviewed this booking.');
        if (![1, 2, 3, 4, 5].includes(input.rating)) validation('Rating must be between 1 and 5.');
        const comment = input.comment.trim().slice(0, 1000);
        const review = {
          id: ctx.nextId('rev'),
          bookingId: booking.id,
          customerId: customer.id,
          technicianId: booking.technicianId,
          serviceId: booking.serviceId,
          rating: input.rating,
          comment,
          language: ARABIC_PATTERN.test(comment) ? ('ar' as const) : ('en' as const),
          status: 'published' as const,
          createdAt: ctx.nowISO(),
        };
        ctx.state.reviews.push(review);
        booking.reviewId = review.id;
        booking.timeline.push({ type: 'reviewed', at: ctx.nowISO(), actor: 'customer' });
        touch(ctx, booking);
        recomputeRatings(ctx, booking.technicianId, booking.serviceId);
        notify(
          ctx,
          'technician',
          booking.technicianId,
          'system',
          { en: `New ${input.rating}-star review`, ar: `تقييم جديد (${input.rating} نجوم)` },
          { en: `For ${booking.reference}.`, ar: `للمهمة ${booking.reference}.` },
          booking.id,
        );
        return review;
      }),

    getTracking: (id) =>
      run.read((): TrackingInfo => {
        const booking = ownBooking(currentCustomer(ctx), id);
        const destination = booking.address.location;
        const base = {
          bookingId: booking.id,
          status: booking.status,
          destination,
          updatedAt: ctx.nowISO(),
        };
        if (booking.status === 'arrived' || booking.status === 'in_progress') {
          return { ...base, technicianLocation: destination, etaMinutes: 0, distanceKm: 0 };
        }
        const departed = booking.timeline.filter((e) => e.type === 'on_the_way').pop();
        if (booking.status !== 'on_the_way' || !departed) {
          return { ...base, technicianLocation: null, etaMinutes: null, distanceKm: null };
        }
        // Simulated route: the technician starts ~9 km away and drives at city speed.
        const distanceKm = 7 + (hashString(booking.id) % 40) / 10;
        const bearing = ((hashString(`${booking.id}:b`) % 360) * Math.PI) / 180;
        const travelMin = Math.round((distanceKm / 24) * 60);
        const elapsedMin = (ctx.now() - toMs(departed.at)) / MINUTE_MS;
        const progress = Math.min(0.97, Math.max(0, elapsedMin / travelMin));
        const remainingKm = distanceKm * (1 - progress);
        const origin = {
          lat: destination.lat + (distanceKm / 111) * Math.cos(bearing),
          lng: destination.lng + (distanceKm / 96.8) * Math.sin(bearing),
        };
        return {
          ...base,
          technicianLocation: {
            lat: origin.lat + (destination.lat - origin.lat) * progress,
            lng: origin.lng + (destination.lng - origin.lng) * progress,
          },
          etaMinutes: Math.max(1, Math.ceil(travelMin * (1 - progress))),
          distanceKm: Math.round(remainingKm * 10) / 10,
        };
      }),
  };
}

export function createCustomerAccountApi(ctx: MockContext, run: Runner): CustomerAccountApi {
  return {
    getProfile: () => run.read(() => currentCustomer(ctx)),

    updateProfile: (patch) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        if (patch.fullName !== undefined) {
          const name = patch.fullName.trim().replace(/\s+/g, ' ');
          if (name.length < 2 || name.length > 80) validation('Please enter your full name.');
          customer.fullName = name;
        }
        if (patch.email !== undefined) {
          const email = patch.email.trim();
          if (email && !EMAIL_PATTERN.test(email))
            validation('Please enter a valid email address.');
          if (email) customer.email = email;
          else delete customer.email;
        }
        if (patch.preferredLocale) customer.preferredLocale = patch.preferredLocale;
        if (ctx.state.session?.isNewUser && customer.fullName) ctx.state.session.isNewUser = false;
        return customer;
      }),

    saveAddress: (input) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        if (!getArea(input.areaId)) validation('Please choose an area.');
        for (const field of ['block', 'street', 'building'] as const) {
          if (!input[field]?.trim()) validation(`Please enter the ${field}.`, { field });
        }
        const existing = input.id ? customer.addresses.find((a) => a.id === input.id) : undefined;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Address not found.');
        const makeDefault =
          input.isDefault ?? (existing?.isDefault || customer.addresses.length === 0);
        const address: Address = {
          ...input,
          id: existing?.id ?? ctx.nextId('adr'),
          block: input.block.trim(),
          street: input.street.trim(),
          building: input.building.trim(),
          isDefault: makeDefault,
        };
        if (makeDefault) customer.addresses.forEach((a) => (a.isDefault = false));
        customer.addresses = existing
          ? customer.addresses.map((a) => (a.id === address.id ? address : a))
          : [...customer.addresses, address];
        return address;
      }),

    deleteAddress: (id) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        const address = customer.addresses.find((a) => a.id === id);
        if (!address) throw new ApiError('NOT_FOUND', 'Address not found.');
        customer.addresses = customer.addresses.filter((a) => a.id !== id);
        const first = customer.addresses[0];
        if (address.isDefault && first) first.isDefault = true;
      }),

    setDefaultAddress: (id) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        if (!customer.addresses.some((a) => a.id === id))
          throw new ApiError('NOT_FOUND', 'Address not found.');
        customer.addresses.forEach((a) => (a.isDefault = a.id === id));
        return customer.addresses;
      }),

    getWallet: () =>
      run.read(() => {
        const customer = currentCustomer(ctx);
        return {
          balance: customer.walletBalance,
          transactions: ctx.state.walletTransactions
            .filter((t) => t.customerId === customer.id)
            .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
        };
      }),

    topUpWallet: (amount, method) =>
      run.write(() => {
        const customer = currentCustomer(ctx);
        if (!Number.isInteger(amount) || amount < 1_000 || amount > 500_000) {
          validation('Top-ups must be between KWD 1.000 and KWD 500.000.');
        }
        customer.walletBalance += amount;
        const methodLabel =
          method === 'knet' ? 'KNET' : method === 'apple_pay' ? 'Apple Pay' : 'card';
        ctx.state.walletTransactions.unshift({
          id: ctx.nextId('wtx'),
          customerId: customer.id,
          type: 'top_up',
          amount,
          description: {
            en: `Wallet top-up via ${methodLabel} (simulated)`,
            ar: `شحن المحفظة عبر ${methodLabel} (محاكاة)`,
          },
          createdAt: ctx.nowISO(),
        });
        notify(
          ctx,
          'customer',
          customer.id,
          'payment',
          { en: 'Wallet topped up', ar: 'تم شحن المحفظة' },
          {
            en: `${formatMoney(amount)} added to your wallet.`,
            ar: `تمت إضافة ${formatMoney(amount, { locale: 'ar' })} إلى محفظتك.`,
          },
        );
        return {
          balance: customer.walletBalance,
          transactions: ctx.state.walletTransactions.filter((t) => t.customerId === customer.id),
        };
      }),

    listOffers: () =>
      run.read(() => {
        const session = requireSession(ctx, 'customer');
        const hasBookings = ctx.state.bookings.some((b) => b.customerId === session.userId);
        const now = ctx.now();
        return ctx.state.coupons.filter(
          (c) =>
            c.isActive &&
            toMs(c.validFrom) <= now &&
            toMs(c.validUntil) > now &&
            c.usedCount < c.usageLimit &&
            !(c.firstBookingOnly && hasBookings),
        );
      }),
  };
}
