/**
 * The booking flow carries its state in route parameters, so every step can be
 * revisited, reloaded (web) or deep-linked without losing valid choices:
 *   review → address → schedule → checkout → confirmation.
 */
import type { Href } from 'expo-router';

export interface BookingFlowState {
  serviceId: string;
  /** Encoded selections (see selectionCodec). */
  selections: string;
  addressId?: string;
  /** ISO start of the chosen arrival window. */
  slot?: string;
}

type RawParams = Partial<Record<keyof BookingFlowState, string | string[]>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseFlowParams(params: RawParams): BookingFlowState | null {
  const serviceId = single(params.serviceId);
  const selections = single(params.selections);
  if (!serviceId || !selections) return null;
  const addressId = single(params.addressId);
  const slot = single(params.slot);
  return {
    serviceId,
    selections,
    ...(addressId ? { addressId } : {}),
    ...(slot && !Number.isNaN(Date.parse(slot)) ? { slot } : {}),
  };
}

const params = (state: BookingFlowState): Record<string, string> => ({
  serviceId: state.serviceId,
  selections: state.selections,
  ...(state.addressId ? { addressId: state.addressId } : {}),
  ...(state.slot ? { slot: state.slot } : {}),
});

export const bookingFlowRoutes = {
  address: (state: BookingFlowState): Href => ({
    pathname: '/customer/book/address',
    params: params(state),
  }),
  schedule: (state: BookingFlowState & { addressId: string }): Href => ({
    pathname: '/customer/book/schedule',
    params: params(state),
  }),
  checkout: (state: BookingFlowState & { addressId: string; slot: string }): Href => ({
    pathname: '/customer/book/checkout',
    params: params(state),
  }),
  confirmed: (bookingId: string): Href => ({
    pathname: '/customer/book/confirmed',
    params: { bookingId },
  }),
};

/** Which step a flow state is ready for — used to guard deep links into later steps. */
export function readyFor(
  state: BookingFlowState | null,
): 'review' | 'address' | 'schedule' | 'checkout' {
  if (!state) return 'review';
  if (!state.addressId) return 'address';
  if (!state.slot) return 'schedule';
  return 'checkout';
}
