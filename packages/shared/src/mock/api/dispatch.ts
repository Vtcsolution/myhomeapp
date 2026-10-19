/** Booking lifecycle operations shared by the customer, technician and admin modules. */
import { getArea } from '../../geo/kuwait';
import { isTechnicianAvailable, isTechnicianFree } from '../../domain/schedule';
import { addMinutes, toMs } from '../../domain/time';
import { formatMoney } from '../../format/money';
import type { Booking, ID, Technician, UserRole } from '../../types';
import { findService, type MockContext, notify, simulatedReference, touch } from './context';

/** Active technicians who cover the booking's category and governorate. */
export function eligibleTechnicians(ctx: MockContext, categoryId: ID, areaId: ID): Technician[] {
  const governorate = getArea(areaId)?.governorateId;
  return ctx.state.technicians.filter(
    (t) =>
      t.status === 'active' &&
      t.categoryIds.includes(categoryId) &&
      governorate !== undefined &&
      t.governorateIds.includes(governorate),
  );
}

/** Can the technician take this booking at its scheduled time? */
export function canTake(ctx: MockContext, technician: Technician, booking: Booking): boolean {
  const end = addMinutes(
    booking.scheduledStart,
    Math.max(ctx.config.slotLengthMinutes, booking.price.estimatedDurationMin),
  );
  return (
    isTechnicianAvailable(technician, booking.scheduledStart, booking.scheduledEnd) &&
    isTechnicianFree(technician.id, booking.scheduledStart, end, ctx.state.bookings, booking.id)
  );
}

export function ensureChatThread(ctx: MockContext, booking: Booking): void {
  if (!booking.technicianId) return;
  const existing = ctx.state.chatThreads.find((t) => t.bookingId === booking.id);
  if (existing) {
    existing.technicianId = booking.technicianId;
    return;
  }
  const id = `cht-${booking.id}`;
  const text = `Chat opened for booking ${booking.reference}.`;
  ctx.state.chatMessages.push({
    id: `${id}-m1`,
    threadId: id,
    sender: 'system',
    text,
    createdAt: ctx.nowISO(),
  });
  ctx.state.chatThreads.push({
    id,
    bookingId: booking.id,
    customerId: booking.customerId,
    technicianId: booking.technicianId,
    lastMessageAt: ctx.nowISO(),
    lastMessagePreview: text,
    unreadForCustomer: 0,
    unreadForTechnician: 0,
  });
}

/** Assigns a technician to a pending booking (or reassigns a confirmed one). */
export function confirmBooking(
  ctx: MockContext,
  booking: Booking,
  technician: Technician,
  actor: UserRole | 'system',
): void {
  const previous = booking.technicianId;
  booking.technicianId = technician.id;
  booking.vendorId = technician.vendorId;
  booking.offeredTo = [];
  ctx.state.autoConfirmQueue = ctx.state.autoConfirmQueue.filter((id) => id !== booking.id);

  if (booking.status === 'pending') {
    booking.status = 'confirmed';
    booking.timeline.push({ type: 'confirmed', at: ctx.nowISO(), actor });
  } else {
    booking.timeline.push({
      type: 'technician_assigned',
      at: ctx.nowISO(),
      actor,
      note: technician.fullName.en,
    });
  }
  touch(ctx, booking);
  ensureChatThread(ctx, booking);

  const service = findService(ctx, booking.serviceId);
  notify(
    ctx,
    'customer',
    booking.customerId,
    'booking_update',
    previous
      ? { en: 'Technician updated', ar: 'تم تغيير الفني' }
      : { en: 'Booking confirmed', ar: 'تم تأكيد الحجز' },
    {
      en: `${technician.fullName.en} will handle your ${service.name.en}.`,
      ar: `سيتولى ${technician.fullName.ar} خدمة ${service.name.ar}.`,
    },
    booking.id,
  );
  if (actor !== 'technician') {
    notify(
      ctx,
      'technician',
      technician.id,
      'booking_update',
      { en: 'New job assigned', ar: 'تم إسناد مهمة جديدة' },
      {
        en: `${service.name.en} — ${booking.reference}`,
        ar: `${service.name.ar} — ${booking.reference}`,
      },
      booking.id,
    );
  }
  if (previous && previous !== technician.id) {
    notify(
      ctx,
      'technician',
      previous,
      'booking_update',
      { en: 'Job reassigned', ar: 'تمت إعادة إسناد المهمة' },
      {
        en: `${booking.reference} has been moved to another technician.`,
        ar: `تم نقل ${booking.reference} إلى فني آخر.`,
      },
      booking.id,
    );
  }
}

/** Offers a pending booking to up to `limit` free, eligible technicians. */
export function offerToTechnicians(ctx: MockContext, booking: Booking, limit = 3): void {
  const service = findService(ctx, booking.serviceId);
  const candidates = eligibleTechnicians(ctx, booking.categoryId, booking.address.areaId)
    .filter((t) => !booking.declinedBy.includes(t.id) && canTake(ctx, t, booking))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
  booking.offeredTo = candidates.map((t) => t.id);
  for (const t of candidates) {
    notify(
      ctx,
      'technician',
      t.id,
      'job_offer',
      { en: 'New job request', ar: 'طلب عمل جديد' },
      {
        en: `${service.name.en} — respond to secure the job.`,
        ar: `${service.name.ar} — بادر بالرد لتأكيد المهمة.`,
      },
      booking.id,
    );
  }
}

/** Cancels a booking and refunds what was paid, minus any fee. */
export function cancelBooking(
  ctx: MockContext,
  booking: Booking,
  by: UserRole | 'system',
  reason: string,
  fee: number,
): void {
  const refund = Math.max(0, booking.payment.paidAmount - fee);
  booking.status = 'cancelled';
  booking.cancellation = { by, reason, at: ctx.nowISO(), fee, refundAmount: refund };
  booking.payment.refundedAmount = refund;
  if (refund > 0) booking.payment.status = fee > 0 ? 'partially_refunded' : 'refunded';
  booking.timeline.push({ type: 'cancelled', at: ctx.nowISO(), actor: by, note: reason });
  booking.offeredTo = [];
  ctx.state.autoConfirmQueue = ctx.state.autoConfirmQueue.filter((id) => id !== booking.id);
  touch(ctx, booking);

  if (refund > 0 && booking.payment.method === 'wallet') {
    const customer = ctx.state.customers.find((c) => c.id === booking.customerId);
    if (customer) {
      customer.walletBalance += refund;
      ctx.state.walletTransactions.unshift({
        id: ctx.nextId('wtx'),
        customerId: customer.id,
        type: 'refund',
        amount: refund,
        description: {
          en: `Refund for ${booking.reference}`,
          ar: `استرداد الحجز ${booking.reference}`,
        },
        bookingId: booking.id,
        createdAt: ctx.nowISO(),
      });
    }
  }

  notify(
    ctx,
    'customer',
    booking.customerId,
    'booking_update',
    { en: 'Booking cancelled', ar: 'تم إلغاء الحجز' },
    refund > 0
      ? {
          en: `${booking.reference} was cancelled. ${formatMoney(refund)} will be refunded (simulated).`,
          ar: `تم إلغاء ${booking.reference}. سيتم استرداد ${formatMoney(refund, { locale: 'ar' })} (محاكاة).`,
        }
      : { en: `${booking.reference} was cancelled.`, ar: `تم إلغاء ${booking.reference}.` },
    booking.id,
  );
  if (refund > 0) {
    const toWallet = booking.payment.method === 'wallet';
    notify(
      ctx,
      'customer',
      booking.customerId,
      'payment',
      { en: 'Refund processed (simulated)', ar: 'تمت معالجة الاسترداد (محاكاة)' },
      toWallet
        ? {
            en: `${formatMoney(refund)} for ${booking.reference} was returned to your wallet.`,
            ar: `تمت إعادة ${formatMoney(refund, { locale: 'ar' })} عن ${booking.reference} إلى محفظتك.`,
          }
        : {
            en: `${formatMoney(refund)} for ${booking.reference} was refunded to your original payment method. No real money was moved.`,
            ar: `تم استرداد ${formatMoney(refund, { locale: 'ar' })} عن ${booking.reference} إلى وسيلة الدفع الأصلية. لم تُنقل أي أموال حقيقية.`,
          },
      booking.id,
    );
  }
  if (booking.technicianId) {
    notify(
      ctx,
      'technician',
      booking.technicianId,
      'booking_update',
      { en: 'Job cancelled', ar: 'تم إلغاء المهمة' },
      { en: `${booking.reference} has been cancelled.`, ar: `تم إلغاء ${booking.reference}.` },
      booking.id,
    );
  }
}

/** Marks a booking fully paid (on completion). */
export function settlePayment(ctx: MockContext, booking: Booking): void {
  booking.payment.paidAmount = booking.price.total;
  booking.payment.status = 'paid';
  booking.payment.paidAt ??= ctx.nowISO();
  booking.payment.reference ??= simulatedReference();
}

/**
 * Demo simulation: bookings created through the API are accepted by the first
 * free offered technician after `delaySec`, so a single-device demo shows the
 * full flow without someone acting as the technician.
 */
export function runAutoConfirm(ctx: MockContext, delaySec: number | null): boolean {
  if (delaySec === null || !ctx.state.autoConfirmQueue.length) return false;
  let changed = false;
  for (const id of [...ctx.state.autoConfirmQueue]) {
    const booking = ctx.state.bookings.find((b) => b.id === id);
    if (!booking || booking.status !== 'pending') {
      ctx.state.autoConfirmQueue = ctx.state.autoConfirmQueue.filter((q) => q !== id);
      changed = true;
      continue;
    }
    if (ctx.now() - toMs(booking.createdAt) < delaySec * 1000) continue;
    const technician = booking.offeredTo
      .map((tid) => ctx.state.technicians.find((t) => t.id === tid))
      .find((t): t is Technician => !!t && t.status === 'active' && canTake(ctx, t, booking));
    if (technician) {
      confirmBooking(ctx, booking, technician, 'system');
      changed = true;
    }
  }
  return changed;
}
