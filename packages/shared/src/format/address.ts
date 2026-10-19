import { getArea, getGovernorate } from '../geo/kuwait';
import type { Locale } from '../types/common';
import type { Address, PropertyType } from '../types/geo';

const LABELS = {
  en: {
    block: 'Block',
    street: 'Street',
    avenue: 'Avenue',
    floor: 'Floor',
    apartment: 'Apt',
    building: { apartment: 'Building', house: 'House', villa: 'Villa', office: 'Building' },
  },
  ar: {
    block: 'قطعة',
    street: 'شارع',
    avenue: 'جادة',
    floor: 'الدور',
    apartment: 'شقة',
    building: { apartment: 'عمارة', house: 'منزل', villa: 'فيلا', office: 'مبنى' },
  },
} as const satisfies Record<
  Locale,
  {
    block: string;
    street: string;
    avenue: string;
    floor: string;
    apartment: string;
    building: Record<PropertyType, string>;
  }
>;

const isNumeric = (v: string) => /^\d+[A-Za-z]?$/.test(v.trim());

/** Numbered streets get a prefix ("Street 15"); named streets are shown as entered. */
function labelled(prefix: string, value: string): string {
  return isNumeric(value) ? `${prefix} ${value.trim()}` : value.trim();
}

export type AddressStyle = 'short' | 'line' | 'full';

/**
 * - short: `Salmiya, Block 10`
 * - line:  `Block 10, Street 5, Avenue 2, House 20` (no area)
 * - full:  `Salmiya, Block 10, Street 5, Avenue 2, House 20, Floor 2, Apt 5, Hawalli`
 */
export function formatAddress(
  address: Address,
  style: AddressStyle = 'full',
  locale: Locale = 'en',
): string {
  const l = LABELS[locale];
  const sep = locale === 'ar' ? '، ' : ', ';
  const area = getArea(address.areaId);
  const areaName = area?.name[locale] ?? address.areaId;
  const block = `${l.block} ${address.block}`;

  if (style === 'short') return [areaName, block].join(sep);

  const parts = [
    block,
    labelled(l.street, address.street),
    address.avenue ? labelled(l.avenue, address.avenue) : null,
    `${l.building[address.propertyType]} ${address.building}`,
  ];
  if (style === 'line') return parts.filter(Boolean).join(sep);

  const governorate = area ? getGovernorate(area.governorateId)?.name[locale] : undefined;
  return [
    areaName,
    ...parts,
    address.floor ? `${l.floor} ${address.floor}` : null,
    address.apartment ? `${l.apartment} ${address.apartment}` : null,
    governorate,
  ]
    .filter(Boolean)
    .join(sep);
}

const ADDRESS_LABELS = {
  home: { en: 'Home', ar: 'المنزل' },
  work: { en: 'Work', ar: 'العمل' },
  other: { en: 'Other', ar: 'أخرى' },
} as const;

export function addressTitle(address: Address, locale: Locale = 'en'): string {
  if (address.label === 'other' && address.customLabel) return address.customLabel;
  return ADDRESS_LABELS[address.label][locale];
}
