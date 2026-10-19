/**
 * Kuwaiti address rules shared by the customer app (form validation) and the
 * API (server-side validation), so both always agree.
 */
import { isValidKuwaitMobile, normalizeKuwaitPhone } from '../format/phone';
import { toLatinDigits } from '../format/number';
import { getArea } from '../geo/kuwait';
import type { Address } from '../types/geo';

export type AddressDraft = Pick<
  Address,
  | 'label'
  | 'customLabel'
  | 'propertyType'
  | 'areaId'
  | 'block'
  | 'street'
  | 'avenue'
  | 'building'
  | 'floor'
  | 'apartment'
  | 'paciNumber'
  | 'contactPhone'
  | 'directions'
>;

export type AddressField =
  | 'areaId'
  | 'block'
  | 'street'
  | 'building'
  | 'apartment'
  | 'customLabel'
  | 'paciNumber'
  | 'contactPhone'
  | 'directions';

export interface AddressIssue {
  field: AddressField;
  code: 'required' | 'invalid' | 'too_long';
}

const LIMITS = {
  block: 10,
  street: 60,
  avenue: 40,
  building: 20,
  floor: 10,
  apartment: 10,
  customLabel: 30,
  directions: 200,
};
/** PACI civil-address (unit) numbers are numeric. */
const PACI_PATTERN = /^\d{6,12}$/;

const clean = (value: string | undefined) => (value ?? '').trim();

export function validateAddress(draft: AddressDraft): AddressIssue[] {
  const issues: AddressIssue[] = [];
  const required = (field: AddressField, value: string | undefined, max: number) => {
    const v = clean(value);
    if (!v) issues.push({ field, code: 'required' });
    else if (v.length > max) issues.push({ field, code: 'too_long' });
  };

  if (!draft.areaId || !getArea(draft.areaId)) issues.push({ field: 'areaId', code: 'required' });
  required('block', draft.block, LIMITS.block);
  required('street', draft.street, LIMITS.street);
  required('building', draft.building, LIMITS.building);
  if (draft.propertyType === 'apartment') required('apartment', draft.apartment, LIMITS.apartment);
  if (draft.label === 'other') required('customLabel', draft.customLabel, LIMITS.customLabel);

  const paci = toLatinDigits(clean(draft.paciNumber));
  if (paci && !PACI_PATTERN.test(paci)) issues.push({ field: 'paciNumber', code: 'invalid' });
  const phone = clean(draft.contactPhone);
  if (phone && !isValidKuwaitMobile(phone)) issues.push({ field: 'contactPhone', code: 'invalid' });
  if (clean(draft.directions).length > LIMITS.directions)
    issues.push({ field: 'directions', code: 'too_long' });
  return issues;
}

/** Trims fields, normalises digits and the phone number, and drops empty optional fields. */
export function normalizeAddressDraft<T extends AddressDraft>(draft: T): T {
  const optional = (value: string | undefined) => {
    const v = clean(value);
    return v ? v : undefined;
  };
  const result: T = {
    ...draft,
    block: clean(draft.block),
    street: clean(draft.street),
    building: clean(draft.building),
  };
  const set = <K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) => {
    if (value === undefined) delete (result as Partial<AddressDraft>)[key];
    else (result as AddressDraft)[key] = value;
  };
  set('avenue', optional(draft.avenue));
  set('floor', optional(draft.floor));
  set('apartment', optional(draft.apartment));
  set('customLabel', draft.label === 'other' ? optional(draft.customLabel) : undefined);
  set('directions', optional(draft.directions));
  const paci = optional(draft.paciNumber);
  set('paciNumber', paci ? toLatinDigits(paci) : undefined);
  const phone = optional(draft.contactPhone);
  set('contactPhone', phone ? (normalizeKuwaitPhone(phone) ?? phone) : undefined);
  return result;
}
