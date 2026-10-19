import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useCustomerProfile, useService } from '@/data/queries';
import { type BookingFlowState, parseFlowParams } from '@/lib/bookingFlow';
import { decodeSelections } from '@/lib/selectionCodec';

/**
 * Everything a booking step needs, resolved from the route parameters: the
 * flow state, the service, the validated selections and the chosen address.
 */
export function useBookingFlow() {
  const params = useLocalSearchParams<{ [K in keyof BookingFlowState]?: string }>();
  const { serviceId, selections: rawSelections, addressId, slot } = params;
  const flow = useMemo(
    () => parseFlowParams({ serviceId, selections: rawSelections, addressId, slot }),
    [serviceId, rawSelections, addressId, slot],
  );
  const service = useService(flow?.serviceId);
  const profile = useCustomerProfile();
  const decoded = useMemo(
    () => (service.data && flow ? decodeSelections(flow.selections, service.data) : undefined),
    [flow, service.data],
  );
  const address = flow?.addressId
    ? profile.data?.addresses.find((a) => a.id === flow.addressId)
    : undefined;

  return {
    flow,
    service,
    profile,
    selections: decoded?.selections,
    address,
    /** True while the service or profile needed to render the step is loading. */
    isPending: !!flow && (service.isPending || profile.isPending),
    isError: service.isError || profile.isError,
    refetch: () => {
      void service.refetch();
      void profile.refetch();
    },
  };
}
