/**
 * Data hooks. Screens never call the API directly; they use these hooks so
 * caching, loading and error handling are consistent, and so swapping the
 * simulated backend for the real one does not touch any screen.
 */
import type {
  AddressInput,
  BookingScope,
  BookingSelections,
  CreateBookingRequest,
  CreateTicketRequest,
  EarningsRange,
  GovernorateId,
  JobScope,
  Review,
} from '@myhome/shared';
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSession } from '@/providers/SessionProvider';
import { api } from '@/services/api';

/** Query keys are scoped to the signed-in user so accounts never share cache. */
function useUserKey(): string {
  const { session } = useSession();
  return session ? `${session.role}:${session.userId}` : 'anonymous';
}

function useReady(): boolean {
  const { status, session } = useSession();
  return status === 'ready' && session !== null;
}

// ─── Catalogue (public) ─────────────────────────────────────────────────────

export const useCategories = () =>
  useQuery({ queryKey: ['catalog', 'categories'], queryFn: () => api.catalog.listCategories() });

export const usePromotions = () =>
  useQuery({ queryKey: ['catalog', 'promotions'], queryFn: () => api.catalog.listPromotions() });

export const usePopularServices = () =>
  useQuery({
    queryKey: ['catalog', 'services', 'popular'],
    queryFn: () => api.catalog.listServices({ popular: true }),
  });

export const useAllServices = () =>
  useQuery({ queryKey: ['catalog', 'services', 'all'], queryFn: () => api.catalog.listServices() });

export const useCategory = (id: string | undefined) =>
  useQuery({
    queryKey: ['catalog', 'category', id],
    queryFn: () => api.catalog.getCategory(id as string),
    enabled: !!id,
  });

export const useCategoryServices = (categoryId: string | undefined) =>
  useQuery({
    queryKey: ['catalog', 'services', 'category', categoryId],
    queryFn: () => api.catalog.listServices({ categoryId }),
    enabled: !!categoryId,
  });

export const useService = (id: string | undefined) =>
  useQuery({
    queryKey: ['catalog', 'service', id],
    queryFn: () => api.catalog.getService(id as string),
    enabled: !!id,
  });

export const useServiceReviews = (serviceId: string | undefined, limit = 3) =>
  useQuery({
    queryKey: ['catalog', 'reviews', serviceId, limit],
    queryFn: () => api.catalog.listServiceReviews(serviceId as string, limit),
    enabled: !!serviceId,
  });

/** Bilingual search (shared normalisation, so "تكييف" also finds "التكييف"). */
export const useServiceSearch = (query: string) =>
  useQuery({
    queryKey: ['catalog', 'search', query],
    queryFn: () => api.catalog.search(query),
    enabled: query.trim().length > 0,
    placeholderData: (previous) => previous,
  });

// ─── Customer ────────────────────────────────────────────────────────────────

export function useCustomerProfile() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'profile'],
    queryFn: () => api.account.getProfile(),
    enabled: useReady(),
  });
}

export function useCustomerBookings(scope: BookingScope) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'bookings', scope],
    queryFn: () => api.bookings.list(scope),
    enabled: useReady(),
  });
}

export function useCustomerOffers() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'offers'],
    queryFn: () => api.account.listOffers(),
    enabled: useReady(),
  });
}

export function useWallet() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'wallet'],
    queryFn: () => api.account.getWallet(),
    enabled: useReady(),
  });
}

/** Authoritative price for a configured service (same shared pricing engine, served by the API). */
export function useQuote(
  serviceId: string | undefined,
  selections: BookingSelections | undefined,
  couponCode?: string,
) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'quote', serviceId, selections, couponCode ?? null],
    queryFn: () =>
      api.bookings.getQuote({
        serviceId: serviceId as string,
        selections: selections as BookingSelections,
        ...(couponCode ? { couponCode } : {}),
      }),
    enabled: useReady() && !!serviceId && !!selections,
    // Keep showing the current price while a promo code is being checked.
    placeholderData: keepPreviousData,
  });
}

export function useLiveTracking(bookingId: string | undefined) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'tracking', bookingId],
    queryFn: () => api.bookings.getTracking(bookingId as string),
    enabled: useReady() && !!bookingId,
    refetchInterval: 15_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return useMutation({
    mutationFn: (patch: { fullName?: string; email?: string; preferredLocale?: 'en' | 'ar' }) =>
      api.account.updateProfile(patch),
    onSuccess: (profile) => queryClient.setQueryData([user, 'profile'], profile),
  });
}

// ─── Notifications (either role) ─────────────────────────────────────────────

export function useNotifications() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'notifications'],
    queryFn: () => api.notifications.list(),
    enabled: useReady(),
    // Booking changes and simulated replies arrive without a push service.
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'notifications', 'unread'],
    queryFn: () => api.notifications.unreadCount(),
    enabled: useReady(),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [user, 'notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [user, 'notifications'] }),
  });
}

// ─── Technician ──────────────────────────────────────────────────────────────

export function useTechnicianProfile() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'pro', 'profile'],
    queryFn: () => api.technician.getProfile(),
    enabled: useReady(),
  });
}

export function useTechnicianDashboard() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'pro', 'dashboard'],
    queryFn: () => api.technician.getDashboard(),
    enabled: useReady(),
  });
}

export function useJobOffers() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'pro', 'offers'],
    queryFn: () => api.technician.listOffers(),
    enabled: useReady(),
  });
}

export function useJobs(scope: JobScope) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'pro', 'jobs', scope],
    queryFn: () => api.technician.listJobs(scope),
    enabled: useReady(),
  });
}

export function useEarnings(range: EarningsRange) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'pro', 'earnings', range],
    queryFn: () => api.technician.getEarnings(range),
    enabled: useReady(),
  });
}

export function useSetOnline() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return useMutation({
    mutationFn: (online: boolean) => api.technician.setOnline(online),
    onSuccess: (profile) => {
      queryClient.setQueryData([user, 'pro', 'profile'], profile);
      return queryClient.invalidateQueries({ queryKey: [user, 'pro', 'dashboard'] });
    },
  });
}

// ─── Booking flow (stage 4) ──────────────────────────────────────────────────

/** Refreshes everything a booking change can affect. */
function useInvalidateBookings() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [user, 'bookings'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'booking'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'tracking'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'wallet'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'notifications'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'slots'] }),
    ]);
}

export function useBooking(id: string | undefined) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'booking', id],
    queryFn: () => api.bookings.get(id as string),
    enabled: useReady() && !!id,
    // Keeps status changes (e.g. a professional accepting) visible while open.
    refetchInterval: 20_000,
  });
}

export const useGovernorates = () =>
  useQuery({
    queryKey: ['geo', 'governorates'],
    queryFn: () => api.catalog.listGovernorates(),
    staleTime: Infinity,
  });

export const useAreas = (governorateId: GovernorateId | '' | undefined) =>
  useQuery({
    queryKey: ['geo', 'areas', governorateId],
    queryFn: () => api.catalog.listAreas(governorateId as GovernorateId),
    enabled: !!governorateId,
    staleTime: Infinity,
  });

export function useBookableDates() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'slots', 'dates'],
    queryFn: () => api.bookings.getBookableDates(),
    enabled: useReady(),
  });
}

/**
 * Availability for every bookable date at once (parallel requests), so the
 * date strip can disable fully-booked days and pre-select the first open one.
 */
export function useSlotsByDate(
  dates: readonly string[] | undefined,
  request:
    | { serviceId: string; selections: BookingSelections; addressId: string }
    | { bookingId: string }
    | null,
) {
  const user = useUserKey();
  const ready = useReady();
  return useQueries({
    queries: (dates ?? []).map((date) => ({
      queryKey: [user, 'slots', request, date],
      queryFn: () =>
        request && 'bookingId' in request
          ? api.bookings.getRescheduleSlots(request.bookingId, date)
          : api.bookings.getAvailableSlots({
              ...(request as Exclude<typeof request, null | { bookingId: string }>),
              date,
            }),
      enabled: ready && !!request,
      staleTime: 15_000,
    })),
  });
}

export function useCreateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (request: CreateBookingRequest) => api.bookings.create(request),
    onSuccess: () => invalidate(),
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.bookings.cancel(id, reason),
    onSuccess: () => invalidate(),
  });
}

export function useRescheduleBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, slotStart }: { id: string; slotStart: string }) =>
      api.bookings.reschedule(id, slotStart),
    onSuccess: () => invalidate(),
  });
}

export function useRespondToExtraCharge() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({
      bookingId,
      chargeId,
      approve,
    }: {
      bookingId: string;
      chargeId: string;
      approve: boolean;
    }) => api.bookings.respondToExtraCharge(bookingId, chargeId, approve),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitReview() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({
      bookingId,
      rating,
      comment,
    }: {
      bookingId: string;
      rating: Review['rating'];
      comment: string;
    }) => api.bookings.submitReview(bookingId, { rating, comment }),
    onSuccess: () => invalidate(),
  });
}

// ─── Addresses ───────────────────────────────────────────────────────────────

function useInvalidateProfile() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [user, 'profile'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'slots'] }),
    ]);
}

export function useSaveAddress() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: AddressInput) => api.account.saveAddress(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteAddress() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (id: string) => api.account.deleteAddress(id),
    onSuccess: () => invalidate(),
  });
}

export function useSetDefaultAddress() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (id: string) => api.account.setDefaultAddress(id),
    onSuccess: () => invalidate(),
  });
}

// ─── Messages and support (stage 5) ──────────────────────────────────────────

/** While a conversation is open, poll so simulated replies appear. */
const LIVE_CONVERSATION_MS = 3_000;

export function useChatThreads() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'chat', 'threads'],
    queryFn: () => api.chat.listThreads(),
    enabled: useReady(),
  });
}

export function useChatThread(id: string | undefined) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'chat', 'thread', id],
    queryFn: () => api.chat.getThread(id as string),
    enabled: useReady() && !!id,
  });
}

export function useChatMessages(threadId: string | undefined) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'chat', 'messages', threadId],
    queryFn: () => api.chat.getMessages(threadId as string),
    enabled: useReady() && !!threadId,
    refetchInterval: LIVE_CONVERSATION_MS,
  });
}

function useInvalidateEngagement() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [user, 'chat'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'tickets'] }),
      queryClient.invalidateQueries({ queryKey: [user, 'notifications'] }),
    ]);
}

export function useSendMessage(threadId: string) {
  const invalidate = useInvalidateEngagement();
  return useMutation({
    mutationFn: (text: string) => api.chat.sendMessage(threadId, text),
    onSuccess: () => invalidate(),
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return useMutation({
    mutationFn: (threadId: string) => api.chat.markRead(threadId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [user, 'chat', 'threads'] }),
  });
}

export function useTickets() {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'tickets'],
    queryFn: () => api.support.listTickets(),
    enabled: useReady(),
  });
}

export function useTicket(id: string | undefined) {
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'tickets', id],
    queryFn: () => api.support.getTicket(id as string),
    enabled: useReady() && !!id,
    refetchInterval: LIVE_CONVERSATION_MS,
  });
}

export function useCreateTicket() {
  const invalidate = useInvalidateEngagement();
  return useMutation({
    mutationFn: (request: CreateTicketRequest) => api.support.createTicket(request),
    onSuccess: () => invalidate(),
  });
}

export function useReplyToTicket(id: string) {
  const invalidate = useInvalidateEngagement();
  return useMutation({
    mutationFn: (text: string) => api.support.reply(id, text),
    onSuccess: () => invalidate(),
  });
}
