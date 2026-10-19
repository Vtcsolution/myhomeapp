import type { BookingSelections, Promotion, TicketCategory } from '@myhome/shared';
import type { Href } from 'expo-router';
import { encodeSelections } from '@/lib/selectionCodec';

/** Typed links for the customer discovery journey. */
export const customerRoutes = {
  categories: '/customer/categories' as const,
  search: '/customer/search' as const,
  category: (id: string): Href => ({ pathname: '/customer/category/[id]', params: { id } }),
  service: (id: string): Href => ({ pathname: '/customer/service/[id]', params: { id } }),
  /** First step of the booking flow; the configured selection travels with it. */
  book: (serviceId: string, selections: BookingSelections): Href => ({
    pathname: '/customer/book/[serviceId]',
    params: { serviceId, selections: encodeSelections(selections) },
  }),
  promotion: (promotion: Promotion): Href =>
    promotion.target.type === 'service'
      ? customerRoutes.service(promotion.target.id)
      : customerRoutes.category(promotion.target.id),
  booking: (id: string): Href => ({ pathname: '/customer/booking/[id]', params: { id } }),
  track: (id: string): Href => ({ pathname: '/customer/booking/[id]/track', params: { id } }),
  reschedule: (id: string): Href => ({
    pathname: '/customer/booking/[id]/reschedule',
    params: { id },
  }),
  addresses: '/customer/addresses' as const,
  profile: '/customer/profile' as const,
  notificationSettings: '/customer/notification-settings' as const,
  security: '/customer/security' as const,
  wallet: '/customer/wallet' as const,
  notifications: '/customer/notifications' as const,
  support: '/customer/support' as const,
  newTicket: (params: { category?: TicketCategory; bookingId?: string } = {}): Href => ({
    pathname: '/customer/support/new',
    params,
  }),
  ticket: (id: string): Href => ({ pathname: '/customer/support/[id]', params: { id } }),
  messages: '/customer/messages' as const,
  chat: (id: string): Href => ({ pathname: '/customer/chat/[id]', params: { id } }),
  addressForm: (params: { id?: string; from?: 'booking' } = {}): Href => ({
    pathname: '/customer/address-form',
    params,
  }),
};
