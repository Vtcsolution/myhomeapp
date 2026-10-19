import type {
  BookingView,
  ChatThreadView,
  ReviewView,
  TechnicianSummary,
} from '../../api/contracts';
import { isCustomerCancellable } from '../../domain/bookingStatus';
import type { Booking, ChatThread, Review, Technician, UserRole } from '../../types';
import {
  canReschedule,
  cancellationFeeFor,
  displayName,
  findCategory,
  findCustomer,
  findService,
  type MockContext,
  vendorOf,
} from './context';

export function technicianSummary(ctx: MockContext, technician: Technician): TechnicianSummary {
  const vendor = vendorOf(ctx, technician);
  return {
    id: technician.id,
    fullName: technician.fullName,
    headline: technician.headline,
    rating: technician.rating,
    reviewsCount: technician.reviewsCount,
    jobsCompleted: technician.jobsCompleted,
    yearsExperience: technician.yearsExperience,
    languages: technician.languages,
    ...(vendor ? { vendorName: vendor.name } : {}),
  };
}

export function bookingView(ctx: MockContext, booking: Booking): BookingView {
  const service = findService(ctx, booking.serviceId);
  const category = findCategory(ctx, booking.categoryId);
  const customer = findCustomer(ctx, booking.customerId);
  const technician = booking.technicianId
    ? ctx.state.technicians.find((t) => t.id === booking.technicianId)
    : undefined;
  const review = booking.reviewId
    ? ctx.state.reviews.find((r) => r.id === booking.reviewId)
    : undefined;
  const thread = ctx.state.chatThreads.find((t) => t.bookingId === booking.id);
  const balanceDue =
    booking.status === 'cancelled'
      ? 0
      : Math.max(0, booking.price.total - booking.payment.paidAmount);

  return {
    ...booking,
    service: {
      id: service.id,
      name: service.name,
      image: service.image,
      pricingModel: service.pricingModel,
      warrantyDays: service.warrantyDays,
      ...(service.unitLabel ? { unitLabel: service.unitLabel } : {}),
    },
    category: { id: category.id, name: category.name, icon: category.icon },
    customer: { id: customer.id, fullName: customer.fullName, phone: customer.phone },
    technician: technician ? technicianSummary(ctx, technician) : null,
    review: review ?? null,
    chatThreadId: thread?.id ?? null,
    balanceDue,
    canCancel: isCustomerCancellable(booking.status),
    canReschedule: canReschedule(ctx, booking),
    cancellationFee: cancellationFeeFor(ctx, booking),
  };
}

export function reviewView(ctx: MockContext, review: Review): ReviewView {
  const customer = ctx.state.customers.find((c) => c.id === review.customerId);
  const service = ctx.state.services.find((s) => s.id === review.serviceId);
  const technician = ctx.state.technicians.find((t) => t.id === review.technicianId);
  return {
    ...review,
    customerDisplayName: customer ? displayName(customer.fullName) : 'Customer',
    serviceName: service?.name ?? { en: '', ar: '' },
    technicianName: technician?.fullName ?? { en: '', ar: '' },
  };
}

export function threadView(ctx: MockContext, thread: ChatThread, role: UserRole): ChatThreadView {
  const booking = ctx.state.bookings.find((b) => b.id === thread.bookingId);
  const service = booking ? ctx.state.services.find((s) => s.id === booking.serviceId) : undefined;
  const customer = ctx.state.customers.find((c) => c.id === thread.customerId);
  const technician = ctx.state.technicians.find((t) => t.id === thread.technicianId);
  const counterpartName =
    role === 'customer'
      ? (technician?.fullName ?? { en: '', ar: '' })
      : { en: customer?.fullName ?? '', ar: customer?.fullName ?? '' };
  return {
    ...thread,
    bookingReference: booking?.reference ?? '',
    serviceName: service?.name ?? { en: '', ar: '' },
    counterpartName,
    unread: role === 'customer' ? thread.unreadForCustomer : thread.unreadForTechnician,
  };
}
