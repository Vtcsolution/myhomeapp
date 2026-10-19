/**
 * Address form state and its mapping to the shared `AddressInput`. Validation
 * itself is the shared `validateAddress`, identical to the API's.
 */
import {
  type Address,
  type AddressField,
  type AddressInput,
  type AddressIssue,
  type AddressLabel,
  getArea,
  type GovernorateId,
  type PropertyType,
  validateAddress,
} from '@myhome/shared';

export interface AddressFormState {
  id?: string;
  label: AddressLabel;
  customLabel: string;
  propertyType: PropertyType;
  governorateId: GovernorateId | '';
  areaId: string;
  block: string;
  street: string;
  avenue: string;
  building: string;
  floor: string;
  apartment: string;
  paciNumber: string;
  contactPhone: string;
  directions: string;
  isDefault: boolean;
}

export const emptyAddressForm = (isDefault: boolean): AddressFormState => ({
  label: 'home',
  customLabel: '',
  propertyType: 'apartment',
  governorateId: '',
  areaId: '',
  block: '',
  street: '',
  avenue: '',
  building: '',
  floor: '',
  apartment: '',
  paciNumber: '',
  contactPhone: '',
  directions: '',
  isDefault,
});

export function formFromAddress(address: Address): AddressFormState {
  return {
    id: address.id,
    label: address.label,
    customLabel: address.customLabel ?? '',
    propertyType: address.propertyType,
    governorateId: getArea(address.areaId)?.governorateId ?? '',
    areaId: address.areaId,
    block: address.block,
    street: address.street,
    avenue: address.avenue ?? '',
    building: address.building,
    floor: address.floor ?? '',
    apartment: address.apartment ?? '',
    paciNumber: address.paciNumber ?? '',
    contactPhone: address.contactPhone ?? '',
    directions: address.directions ?? '',
    isDefault: address.isDefault,
  };
}

/**
 * Builds the API input. The map pin is not part of this demo, so the location
 * is the selected area's centre (clearly an approximation).
 */
export function inputFromForm(form: AddressFormState): AddressInput {
  const area = getArea(form.areaId);
  const optional = (value: string) => (value.trim() ? value : undefined);
  return {
    ...(form.id ? { id: form.id } : {}),
    label: form.label,
    customLabel: form.label === 'other' ? optional(form.customLabel) : undefined,
    propertyType: form.propertyType,
    areaId: form.areaId,
    block: form.block,
    street: form.street,
    avenue: optional(form.avenue),
    building: form.building,
    floor: optional(form.floor),
    apartment: optional(form.apartment),
    paciNumber: optional(form.paciNumber),
    contactPhone: optional(form.contactPhone),
    directions: optional(form.directions),
    location: area?.center ?? { lat: 0, lng: 0 },
    isDefault: form.isDefault,
  };
}

export type FieldErrors = Partial<Record<AddressField, AddressIssue['code']>>;

export function fieldErrors(issues: readonly AddressIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) errors[issue.field] ??= issue.code;
  return errors;
}

export function validateForm(form: AddressFormState): FieldErrors {
  return fieldErrors(validateAddress(inputFromForm(form)));
}

/** Reads field issues from an API validation error's details, if present. */
export function issuesFromError(details: unknown): AddressIssue[] {
  return Array.isArray(details)
    ? details.filter(
        (d): d is AddressIssue => !!d && typeof d === 'object' && 'field' in d && 'code' in d,
      )
    : [];
}
