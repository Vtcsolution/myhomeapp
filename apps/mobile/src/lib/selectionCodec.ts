/**
 * Carries a customer's service configuration between screens (service detail →
 * booking) as a compact, URL-safe string, so the selection survives navigation,
 * web reloads and deep links. Decoding always re-validates against the service
 * with the shared rules; anything invalid falls back to the service defaults.
 */
import {
  type BookingSelections,
  defaultSelections,
  type Service,
  validateSelections,
} from '@myhome/shared';

export function encodeSelections(selections: BookingSelections): string {
  return JSON.stringify({ o: selections.options, a: selections.addOnIds, u: selections.units });
}

export interface DecodedSelections {
  selections: BookingSelections;
  /** True when the input was missing or invalid and defaults were used. */
  usedDefaults: boolean;
}

export function decodeSelections(raw: string | undefined, service: Service): DecodedSelections {
  if (!raw) return { selections: defaultSelections(service), usedDefaults: true };
  try {
    const parsed = JSON.parse(raw) as { o?: unknown; a?: unknown; u?: unknown };
    const options =
      parsed.o && typeof parsed.o === 'object' && !Array.isArray(parsed.o)
        ? Object.fromEntries(
            Object.entries(parsed.o as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {};
    const addOnIds = Array.isArray(parsed.a)
      ? parsed.a.filter((x): x is string => typeof x === 'string')
      : [];
    const units = typeof parsed.u === 'number' ? parsed.u : NaN;
    const selections: BookingSelections = { options, addOnIds, units };
    if (validateSelections(service, selections).length === 0)
      return { selections, usedDefaults: false };
  } catch {
    // Fall through to defaults.
  }
  return { selections: defaultSelections(service), usedDefaults: true };
}
