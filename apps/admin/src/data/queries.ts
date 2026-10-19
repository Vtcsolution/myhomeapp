/**
 * Data hooks for the dashboard. Pages never call the API directly, so moving
 * from the simulated backend to a real one does not touch any page. Every
 * mutation refreshes all admin data (and the mobile apps see the change
 * through the shared demo storage).
 */
import type {
  AdminBookingQuery,
  BookingStatus,
  CouponInput,
  ID,
  ReviewStatus,
  ServiceCategory,
  ServicePricingInput,
  TechnicianStatus,
  TicketStatus,
  VendorInput,
  VendorStatus,
  Customer,
  DocumentStatus,
  PayoutStatus,
  Payout,
} from '@myhome/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSession } from '@/providers/SessionProvider';

const A = 'admin';

function useEnabled() {
  const { session, status } = useSession();
  return status === 'ready' && !!session;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: [A, 'dashboard'],
    queryFn: () => api.admin.getDashboard(),
    enabled: useEnabled(),
    refetchInterval: 30_000,
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: [A, 'profile'],
    queryFn: () => api.admin.getProfile(),
    enabled: useEnabled(),
  });
}

export function useBookings(query: AdminBookingQuery) {
  return useQuery({
    queryKey: [A, 'bookings', query],
    queryFn: () => api.admin.listBookings(query),
    enabled: useEnabled(),
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id: ID | undefined) {
  return useQuery({
    queryKey: [A, 'booking', id],
    queryFn: () => api.admin.getBooking(id as ID),
    enabled: useEnabled() && !!id,
    refetchInterval: 20_000,
  });
}

export function useEligibleTechnicians(bookingId: ID | undefined, enabled = true) {
  return useQuery({
    queryKey: [A, 'eligible', bookingId],
    queryFn: () => api.admin.listEligibleTechnicians(bookingId as ID),
    enabled: useEnabled() && !!bookingId && enabled,
  });
}

export function useCustomers(query: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [A, 'customers', query],
    queryFn: () => api.admin.listCustomers(query),
    enabled: useEnabled(),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: ID | undefined) {
  return useQuery({
    queryKey: [A, 'customer', id],
    queryFn: () => api.admin.getCustomer(id as ID),
    enabled: useEnabled() && !!id,
  });
}

export function useTechnicians(query: Parameters<typeof api.admin.listTechnicians>[0]) {
  return useQuery({
    queryKey: [A, 'technicians', query],
    queryFn: () => api.admin.listTechnicians(query),
    enabled: useEnabled(),
    placeholderData: keepPreviousData,
  });
}

export function useTechnician(id: ID | undefined) {
  return useQuery({
    queryKey: [A, 'technician', id],
    queryFn: () => api.admin.getTechnician(id as ID),
    enabled: useEnabled() && !!id,
  });
}

export function useVendors() {
  return useQuery({
    queryKey: [A, 'vendors'],
    queryFn: () => api.admin.listVendors(),
    enabled: useEnabled(),
  });
}

export function useVendor(id: ID | undefined) {
  return useQuery({
    queryKey: [A, 'vendor', id],
    queryFn: () => api.admin.getVendor(id as ID),
    enabled: useEnabled() && !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [A, 'categories'],
    queryFn: () => api.admin.listCategories(),
    enabled: useEnabled(),
  });
}

export function useServices(filter: { categoryId?: ID; search?: string } = {}) {
  return useQuery({
    queryKey: [A, 'services', filter],
    queryFn: () => api.admin.listServices(filter),
    enabled: useEnabled(),
    placeholderData: keepPreviousData,
  });
}

export function useGovernorates() {
  return useQuery({
    queryKey: ['geo', 'governorates'],
    queryFn: () => api.catalog.listGovernorates(),
    staleTime: Infinity,
  });
}

export function useAreas() {
  return useQuery({
    queryKey: ['geo', 'areas'],
    queryFn: () => api.catalog.listAreas(),
    staleTime: Infinity,
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: [A, 'coupons'],
    queryFn: () => api.admin.listCoupons(),
    enabled: useEnabled(),
  });
}

export function useReviews(query: Parameters<typeof api.admin.listReviews>[0]) {
  return useQuery({
    queryKey: [A, 'reviews', query],
    queryFn: () => api.admin.listReviews(query),
    enabled: useEnabled(),
    placeholderData: keepPreviousData,
  });
}

export function usePayouts(query: { status?: PayoutStatus; payeeType?: Payout['payeeType'] }) {
  return useQuery({
    queryKey: [A, 'payouts', query],
    queryFn: () => api.admin.listPayouts(query),
    enabled: useEnabled(),
  });
}

export function useTickets(query: Parameters<typeof api.admin.listTickets>[0] = {}) {
  return useQuery({
    queryKey: [A, 'tickets', query],
    queryFn: () => api.admin.listTickets(query),
    enabled: useEnabled(),
  });
}

export function useTicket(id: ID | undefined) {
  return useQuery({
    queryKey: [A, 'ticket', id],
    queryFn: () => api.admin.getTicket(id as ID),
    enabled: useEnabled() && !!id,
    refetchInterval: 15_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function useAdminMutation<V, R>(fn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: [A] }),
  });
}

export const useAssignTechnician = () =>
  useAdminMutation(({ bookingId, technicianId }: { bookingId: ID; technicianId: ID }) =>
    api.admin.assignTechnician(bookingId, technicianId),
  );

export const useUpdateBookingStatus = () =>
  useAdminMutation(
    ({ bookingId, status, note }: { bookingId: ID; status: BookingStatus; note?: string }) =>
      api.admin.updateBookingStatus(bookingId, status, note),
  );

export const useSetCustomerStatus = () =>
  useAdminMutation(({ id, status }: { id: ID; status: Customer['status'] }) =>
    api.admin.setCustomerStatus(id, status),
  );

export const useSetTechnicianStatus = () =>
  useAdminMutation(({ id, status }: { id: ID; status: TechnicianStatus }) =>
    api.admin.setTechnicianStatus(id, status),
  );

export const useReviewDocument = () =>
  useAdminMutation(
    ({
      technicianId,
      documentId,
      status,
    }: {
      technicianId: ID;
      documentId: ID;
      status: Extract<DocumentStatus, 'verified' | 'rejected'>;
    }) => api.admin.reviewTechnicianDocument(technicianId, documentId, status),
  );

export const useCreateVendor = () =>
  useAdminMutation((input: VendorInput) => api.admin.createVendor(input));

export const useUpdateVendor = () =>
  useAdminMutation(({ id, patch }: { id: ID; patch: Partial<VendorInput> }) =>
    api.admin.updateVendor(id, patch),
  );

export const useSetVendorStatus = () =>
  useAdminMutation(({ id, status }: { id: ID; status: VendorStatus }) =>
    api.admin.setVendorStatus(id, status),
  );

export const useUpdateCategory = () =>
  useAdminMutation(
    ({
      id,
      patch,
    }: {
      id: ID;
      patch: Partial<Pick<ServiceCategory, 'name' | 'description' | 'isActive' | 'sortOrder'>>;
    }) => api.admin.updateCategory(id, patch),
  );

export const useUpdateService = () =>
  useAdminMutation(
    ({ id, patch }: { id: ID; patch: Parameters<typeof api.admin.updateService>[1] }) =>
      api.admin.updateService(id, patch),
  );

export const useUpdateServicePricing = () =>
  useAdminMutation(({ id, input }: { id: ID; input: ServicePricingInput }) =>
    api.admin.updateServicePricing(id, input),
  );

export const useSaveCoupon = () =>
  useAdminMutation((input: CouponInput) => api.admin.saveCoupon(input));

export const useSetCouponActive = () =>
  useAdminMutation(({ id, isActive }: { id: ID; isActive: boolean }) =>
    api.admin.setCouponActive(id, isActive),
  );

export const useSetReviewStatus = () =>
  useAdminMutation(({ id, status }: { id: ID; status: ReviewStatus }) =>
    api.admin.setReviewStatus(id, status),
  );

export const useMarkPayoutPaid = () => useAdminMutation((id: ID) => api.admin.markPayoutPaid(id));

export const useReplyToTicket = () =>
  useAdminMutation(({ id, text }: { id: ID; text: string }) => api.admin.replyToTicket(id, text));

export const useSetTicketStatus = () =>
  useAdminMutation(({ id, status }: { id: ID; status: TicketStatus }) =>
    api.admin.setTicketStatus(id, status),
  );
