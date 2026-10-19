import type { EarningsRange, JobScope, JobView, TechnicianApi } from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { isFinalStatus, isLiveStatus, nextTechnicianStatus } from '../../domain/bookingStatus';
import { isTechnicianAvailable } from '../../domain/schedule';
import { withExtraCharges } from '../../domain/pricing';
import {
  addDaysToLocalDate,
  DAY_MS,
  kuwaitDateOf,
  kuwaitLocalToISO,
  parseHHmm,
  toKuwaitParts,
  toMs,
} from '../../domain/time';
import { formatMoney } from '../../format/money';
import {
  type Booking,
  mediaKeys,
  type Technician,
  type TechnicianAvailability,
  type Weekday,
} from '../../types';
import {
  commissionRateFor,
  conflict,
  currentTechnician,
  findBooking,
  findService,
  type MockContext,
  netForTechnician,
  notify,
  touch,
  validation,
  vendorOf,
} from './context';
import {
  canTake,
  companyAllowsWork,
  confirmBooking,
  offerToTechnicians,
  settlePayment,
} from './dispatch';
import type { Runner } from './runner';
import { bookingView, reviewView } from './views';

const RANGE_DAYS: Record<EarningsRange, number> = { today: 1, week: 7, month: 30, quarter: 90 };
/** Statuses in which a job holds the professional's time. */
const COMMITTED = new Set(['confirmed', 'on_the_way', 'arrived', 'in_progress']);
const MAX_PHOTOS = 8;

export function createTechnicianApi(ctx: MockContext, run: Runner): TechnicianApi {
  const myJobs = (t: Technician) => ctx.state.bookings.filter((b) => b.technicianId === t.id);

  /** Booking view plus what the job pays this professional (offers use their own rate). */
  const jobView = (t: Technician, b: Booking): JobView => {
    const rate = commissionRateFor(ctx, b.technicianId ?? t.id);
    const commission = Math.round(b.price.total * rate);
    return { ...bookingView(ctx, b), commission, technicianNet: b.price.total - commission };
  };

  /** Notes can be recorded from setting off until after completion. */
  const recordable = (b: Booking) =>
    b.status === 'on_the_way' ||
    b.status === 'arrived' ||
    b.status === 'in_progress' ||
    b.status === 'completed';

  const ownJob = (t: Technician, id: string): Booking => {
    const booking = findBooking(ctx, id);
    if (booking.technicianId !== t.id) throw new ApiError('NOT_FOUND', 'Job not found.');
    return booking;
  };

  const openOffers = (t: Technician) =>
    ctx.state.bookings
      .filter(
        (b) =>
          b.status === 'pending' &&
          b.offeredTo.includes(t.id) &&
          !b.declinedBy.includes(t.id) &&
          toMs(b.scheduledStart) > ctx.now() &&
          canTake(ctx, t, b),
      )
      .sort((a, b) => toMs(a.scheduledStart) - toMs(b.scheduledStart));

  const completedAt = (b: Booking) => b.timeline.filter((e) => e.type === 'completed').pop()?.at;

  const completedSince = (t: Technician, fromMs: number) =>
    myJobs(t).filter((b) => {
      const done = completedAt(b);
      return b.status === 'completed' && done !== undefined && toMs(done) >= fromMs;
    });

  const statusCopy = {
    on_the_way: { en: 'is on the way', ar: 'في الطريق إليك' },
    arrived: { en: 'has arrived', ar: 'وصل إلى موقعك' },
    in_progress: { en: 'has started the work', ar: 'بدأ العمل' },
    completed: { en: 'has completed your service', ar: 'أنهى الخدمة' },
  } as const;

  return {
    getProfile: () =>
      run.read(() => {
        const t = currentTechnician(ctx);
        const vendor = vendorOf(ctx, t);
        return { ...t, vendor: vendor ? { id: vendor.id, name: vendor.name } : null };
      }),

    setOnline: (online) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        if (online && t.status !== 'active') {
          throw new ApiError(
            'FORBIDDEN',
            'Your account must be approved before you can go online.',
          );
        }
        if (online && !companyAllowsWork(ctx, t)) {
          throw new ApiError(
            'FORBIDDEN',
            'Your company is suspended. Contact your company or customer care.',
          );
        }
        t.isOnline = online;
        const vendor = vendorOf(ctx, t);
        return { ...t, vendor: vendor ? { id: vendor.id, name: vendor.name } : null };
      }),

    getDashboard: () =>
      run.read(() => {
        const t = currentTechnician(ctx);
        const today = kuwaitDateOf(ctx.now());
        const jobs = myJobs(t);
        const todayJobs = jobs
          .filter((b) => kuwaitDateOf(b.scheduledStart) === today && b.status !== 'cancelled')
          .sort((a, b) => toMs(a.scheduledStart) - toMs(b.scheduledStart));
        const nextJob =
          jobs
            .filter((b) => b.status === 'confirmed' || isLiveStatus(b.status))
            .sort(
              (a, b) =>
                Number(isLiveStatus(b.status)) - Number(isLiveStatus(a.status)) ||
                toMs(a.scheduledStart) - toMs(b.scheduledStart),
            )[0] ?? null;
        const startOfToday = toMs(kuwaitLocalToISO(today));
        const weekStart = toMs(
          kuwaitLocalToISO(addDaysToLocalDate(today, -toKuwaitParts(ctx.now()).weekday)),
        );
        const net = (list: Booking[]) => list.reduce((s, b) => s + netForTechnician(ctx, b), 0);
        const weekJobs = completedSince(t, weekStart);
        const declined = ctx.state.bookings.filter((b) => b.declinedBy.includes(t.id)).length;
        const accepted = jobs.length;
        return {
          isOnline: t.isOnline,
          todayJobs: todayJobs.map((b) => jobView(t, b)),
          nextJob: nextJob ? jobView(t, nextJob) : null,
          pendingOffers: openOffers(t).length,
          earningsToday: net(completedSince(t, startOfToday)),
          earningsWeek: net(weekJobs),
          jobsCompletedWeek: weekJobs.length,
          rating: t.rating,
          acceptanceRate:
            accepted + declined ? Math.round((accepted / (accepted + declined)) * 100) / 100 : 1,
        };
      }),

    listOffers: () =>
      run.read(() => {
        const t = currentTechnician(ctx);
        return openOffers(t).map((b) => jobView(t, b));
      }),

    acceptOffer: (bookingId) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        if (t.status !== 'active' || !companyAllowsWork(ctx, t))
          throw new ApiError('FORBIDDEN', 'Your account is not active.');
        const booking = findBooking(ctx, bookingId);
        if (booking.status !== 'pending' || !booking.offeredTo.includes(t.id)) {
          conflict('This job is no longer available.');
        }
        if (!canTake(ctx, t, booking)) conflict('You already have a job at this time.');
        confirmBooking(ctx, booking, t, 'technician');
        return jobView(t, booking);
      }),

    declineOffer: (bookingId) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        const booking = findBooking(ctx, bookingId);
        if (booking.status !== 'pending' || !booking.offeredTo.includes(t.id)) {
          conflict('This job is no longer available.');
        }
        booking.declinedBy.push(t.id);
        booking.offeredTo = booking.offeredTo.filter((id) => id !== t.id);
        if (!booking.offeredTo.length) offerToTechnicians(ctx, booking);
        touch(ctx, booking);
      }),

    listJobs: (scope: JobScope = 'all') =>
      run.read(() => {
        const t = currentTechnician(ctx);
        const today = kuwaitDateOf(ctx.now());
        const jobs = myJobs(t);
        const byStartAsc = (a: Booking, b: Booking) =>
          toMs(a.scheduledStart) - toMs(b.scheduledStart);
        const byStartDesc = (a: Booking, b: Booking) => byStartAsc(b, a);
        const selected =
          scope === 'today'
            ? jobs
                .filter((b) => kuwaitDateOf(b.scheduledStart) === today && b.status !== 'cancelled')
                .sort(byStartAsc)
            : scope === 'upcoming'
              ? jobs.filter((b) => !isFinalStatus(b.status)).sort(byStartAsc)
              : scope === 'completed'
                ? jobs.filter((b) => b.status === 'completed').sort(byStartDesc)
                : jobs.sort(byStartDesc);
        return selected.map((b) => jobView(t, b));
      }),

    getJob: (id) =>
      run.read(() => {
        const t = currentTechnician(ctx);
        const booking = findBooking(ctx, id);
        const isOffer = booking.status === 'pending' && booking.offeredTo.includes(t.id);
        if (booking.technicianId !== t.id && !isOffer)
          throw new ApiError('NOT_FOUND', 'Job not found.');
        return jobView(t, booking);
      }),

    advanceJob: (id) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        const booking = ownJob(t, id);
        const next = nextTechnicianStatus(booking.status);
        if (!next) conflict('This job cannot be updated.');
        if (
          next === 'on_the_way' &&
          kuwaitDateOf(booking.scheduledStart) > kuwaitDateOf(ctx.now())
        ) {
          conflict('You can start this job on its scheduled day.');
        }
        if (
          next === 'completed' &&
          booking.extraCharges.some((x) => x.status === 'pending_approval')
        ) {
          conflict('The customer still needs to respond to your extra charge.');
        }
        booking.status = next;
        booking.timeline.push({ type: next, at: ctx.nowISO(), actor: 'technician' });
        if (next === 'completed') {
          settlePayment(ctx, booking);
          t.jobsCompleted += 1;
        }
        touch(ctx, booking);

        const service = findService(ctx, booking.serviceId);
        const copy = statusCopy[next as keyof typeof statusCopy];
        if (copy) {
          notify(
            ctx,
            'customer',
            booking.customerId,
            'booking_update',
            next === 'completed'
              ? { en: 'Service completed', ar: 'تم إنجاز الخدمة' }
              : { en: `${t.fullName.en} ${copy.en}`, ar: `${t.fullName.ar} ${copy.ar}` },
            next === 'completed'
              ? {
                  en: `How was your ${service.name.en}? Tap to rate.`,
                  ar: `كيف كانت خدمة ${service.name.ar}؟ اضغط للتقييم.`,
                }
              : {
                  en: `${service.name.en} — ${booking.reference}`,
                  ar: `${service.name.ar} — ${booking.reference}`,
                },
            booking.id,
          );
        }
        return jobView(t, booking);
      }),

    addExtraCharge: (id, input) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        const booking = ownJob(t, id);
        if (booking.status !== 'arrived' && booking.status !== 'in_progress') {
          conflict('Extra charges can be added once you have arrived.');
        }
        const description = input.description.trim();
        if (description.length < 3 || description.length > 120)
          validation('Describe the extra work briefly.');
        if (!Number.isInteger(input.amount) || input.amount < 500 || input.amount > 2_000_000) {
          validation('Enter an amount between KWD 0.500 and KWD 2,000.000.');
        }
        booking.extraCharges.push({
          id: ctx.nextId('xtr'),
          description,
          amount: input.amount,
          status: 'pending_approval',
          createdAt: ctx.nowISO(),
        });
        booking.price = withExtraCharges(booking.price, booking.extraCharges, ctx.config);
        booking.timeline.push({
          type: 'extra_charge_added',
          at: ctx.nowISO(),
          actor: 'technician',
          note: description,
        });
        touch(ctx, booking);
        notify(
          ctx,
          'customer',
          booking.customerId,
          'booking_update',
          { en: 'Approval needed', ar: 'مطلوب موافقتك' },
          {
            en: `${t.fullName.en} has quoted ${formatMoney(input.amount)} for: ${description}.`,
            ar: `أرسل ${t.fullName.ar} عرض سعر بقيمة ${formatMoney(input.amount, { locale: 'ar' })} مقابل: ${description}.`,
          },
          booking.id,
        );
        return jobView(t, booking);
      }),

    addWorkNote: (id, text) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        const booking = ownJob(t, id);
        if (!recordable(booking)) conflict('Notes can be added once you have set off.');
        const body = text.trim();
        if (body.length < 3 || body.length > 500) validation('Write a note of 3–500 characters.');
        (booking.workNotes ??= []).push({
          id: ctx.nextId('wnt'),
          text: body,
          createdAt: ctx.nowISO(),
        });
        touch(ctx, booking);
        return jobView(t, booking);
      }),

    addWorkPhoto: (id, input) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        const booking = ownJob(t, id);
        if (!recordable(booking) || booking.status === 'on_the_way') {
          conflict('Photos can be added once you have arrived.');
        }
        if (!(mediaKeys as readonly string[]).includes(input.media)) validation('Unknown photo.');
        if (input.stage !== 'before' && input.stage !== 'after') validation('Unknown photo stage.');
        const photos = (booking.workPhotos ??= []);
        if (photos.length >= MAX_PHOTOS) conflict(`A job can have up to ${MAX_PHOTOS} photos.`);
        photos.push({
          id: ctx.nextId('wph'),
          media: input.media,
          stage: input.stage,
          createdAt: ctx.nowISO(),
        });
        touch(ctx, booking);
        return jobView(t, booking);
      }),

    resubmitDocument: (documentId) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        const document = t.documents.find((d) => d.id === documentId);
        if (!document) throw new ApiError('NOT_FOUND', 'Document not found.');
        if (document.status !== 'expired' && document.status !== 'rejected') {
          conflict('Only expired or rejected documents can be submitted again.');
        }
        document.status = 'pending';
        document.uploadedAt = ctx.nowISO();
        delete document.expiresAt;
        const vendor = vendorOf(ctx, t);
        return { ...t, vendor: vendor ? { id: vendor.id, name: vendor.name } : null };
      }),

    getEarnings: (range: EarningsRange = 'week') =>
      run.read(() => {
        const t = currentTechnician(ctx);
        const days = RANGE_DAYS[range];
        const today = kuwaitDateOf(ctx.now());
        const firstDay = addDaysToLocalDate(today, -(days - 1));
        const jobs = completedSince(t, toMs(kuwaitLocalToISO(firstDay)));
        const gross = jobs.reduce((s, b) => s + b.price.total, 0);
        const net = jobs.reduce((s, b) => s + netForTechnician(ctx, b), 0);
        const series = Array.from({ length: days }, (_, i) => {
          const date = addDaysToLocalDate(firstDay, i);
          const dayJobs = jobs.filter(
            (b) => kuwaitDateOf(completedAt(b) ?? b.scheduledStart) === date,
          );
          return {
            date,
            net: dayJobs.reduce((s, b) => s + netForTechnician(ctx, b), 0),
            jobs: dayJobs.length,
          };
        });
        const entries = jobs
          .map((b) => {
            const bookingNet = netForTechnician(ctx, b);
            return {
              bookingId: b.id,
              reference: b.reference,
              serviceName: findService(ctx, b.serviceId).name,
              completedAt: completedAt(b) ?? b.updatedAt,
              gross: b.price.total,
              commission: b.price.total - bookingNet,
              net: bookingNet,
            };
          })
          .sort((a, b) => toMs(b.completedAt) - toMs(a.completedAt));
        return {
          range,
          entries,
          gross,
          commission: gross - net,
          net,
          jobs: jobs.length,
          series,
          paidBy: t.vendorId ? ('vendor' as const) : ('platform' as const),
          payouts: t.vendorId
            ? []
            : ctx.state.payouts
                .filter((p) => p.payeeType === 'technician' && p.payeeId === t.id)
                .sort((a, b) => toMs(b.periodStart) - toMs(a.periodStart)),
        };
      }),

    getAvailability: () => run.read(() => currentTechnician(ctx).availability),

    updateAvailability: (availability: TechnicianAvailability) =>
      run.write(() => {
        const t = currentTechnician(ctx);
        for (const day of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
          const hours = availability.weekly[day];
          if (hours === undefined) validation('Availability must cover every weekday.');
          if (hours && parseHHmm(hours.start) >= parseHHmm(hours.end)) {
            validation('Start time must be before end time.', { day });
          }
        }
        const horizon = ctx.now() + 365 * DAY_MS;
        if (
          availability.daysOff.some(
            (d) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || toMs(kuwaitLocalToISO(d)) > horizon,
          )
        ) {
          validation('Days off must be valid dates within the next year.');
        }
        const next = {
          weekly: availability.weekly,
          daysOff: [...new Set(availability.daysOff)].sort(),
        };
        // Never leave an accepted job outside the professional's working hours.
        const orphaned = myJobs(t).filter(
          (b) =>
            COMMITTED.has(b.status) &&
            !isTechnicianAvailable({ ...t, availability: next }, b.scheduledStart, b.scheduledEnd),
        );
        if (orphaned.length) {
          throw new ApiError(
            'CONFLICT',
            'These hours exclude jobs you have already accepted.',
            orphaned.map((b) => b.reference),
          );
        }
        t.availability = next;
        return t.availability;
      }),

    listReviews: () =>
      run.read(() => {
        const t = currentTechnician(ctx);
        return ctx.state.reviews
          .filter((r) => r.technicianId === t.id && r.status === 'published')
          .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
          .map((r) => reviewView(ctx, r));
      }),
  };
}
