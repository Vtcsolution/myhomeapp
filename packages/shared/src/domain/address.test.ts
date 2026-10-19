import { describe, expect, it } from 'vitest';
import { type AddressDraft, normalizeAddressDraft, validateAddress } from './address';

const base: AddressDraft = {
  label: 'home',
  propertyType: 'villa',
  areaId: 'salwa',
  block: '4',
  street: '12',
  building: '27',
};

const codes = (draft: AddressDraft) => validateAddress(draft).map((i) => `${i.field}:${i.code}`);

describe('address validation', () => {
  it('accepts a complete villa address', () => {
    expect(validateAddress(base)).toEqual([]);
  });

  it('requires area, block, street and building', () => {
    expect(codes({ ...base, areaId: '', block: ' ', street: '', building: '' })).toEqual([
      'areaId:required',
      'block:required',
      'street:required',
      'building:required',
    ]);
    expect(codes({ ...base, areaId: 'atlantis' })).toEqual(['areaId:required']);
  });

  it('requires an apartment number for apartments and a name for "other" labels', () => {
    expect(codes({ ...base, propertyType: 'apartment' })).toEqual(['apartment:required']);
    expect(codes({ ...base, propertyType: 'apartment', apartment: '62' })).toEqual([]);
    expect(codes({ ...base, label: 'other' })).toEqual(['customLabel:required']);
    expect(codes({ ...base, label: 'other', customLabel: "Mother's house" })).toEqual([]);
  });

  it('validates optional PACI and contact phone numbers', () => {
    expect(codes({ ...base, paciNumber: '18734522' })).toEqual([]);
    expect(codes({ ...base, paciNumber: '١٨٧٣٤٥٢٢' })).toEqual([]);
    expect(codes({ ...base, paciNumber: '12AB' })).toEqual(['paciNumber:invalid']);
    expect(codes({ ...base, contactPhone: '9988 7766' })).toEqual([]);
    expect(codes({ ...base, contactPhone: '22410870' })).toEqual(['contactPhone:invalid']);
    expect(codes({ ...base, contactPhone: '123' })).toEqual(['contactPhone:invalid']);
  });

  it('limits field lengths', () => {
    expect(codes({ ...base, block: '12345678901' })).toEqual(['block:too_long']);
    expect(codes({ ...base, directions: 'x'.repeat(201) })).toEqual(['directions:too_long']);
  });
});

describe('address normalisation', () => {
  it('trims, normalises the phone and digits, and drops empty optionals', () => {
    const normalized = normalizeAddressDraft({
      ...base,
      block: ' 4 ',
      avenue: '  ',
      paciNumber: '١٨٧٣٤٥٢٢',
      contactPhone: '9988 7766',
      customLabel: 'ignored for home',
      directions: ' Opposite the mosque ',
    });
    expect(normalized).toEqual({
      ...base,
      paciNumber: '18734522',
      contactPhone: '+96599887766',
      directions: 'Opposite the mosque',
    });
  });
});
