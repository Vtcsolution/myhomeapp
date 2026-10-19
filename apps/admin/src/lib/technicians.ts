/** Helpers for the professionals area (document attention, approval readiness). */
import type { Technician, TechnicianDocument } from '@myhome/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_WARNING_DAYS = 30;

/** Expired, or expiring within the warning window (the same rule as the dashboard alert). */
export function needsAttention(doc: TechnicianDocument, now: number): boolean {
  if (doc.status === 'expired') return true;
  return (
    doc.expiresAt !== undefined && Date.parse(doc.expiresAt) - now <= EXPIRY_WARNING_DAYS * DAY_MS
  );
}

/** Documents needing attention for an active professional (inactive ones are not alerted). */
export function documentsNeedingAttention(
  t: Pick<Technician, 'documents' | 'status'>,
  now: number,
) {
  return t.status === 'active' ? t.documents.filter((d) => needsAttention(d, now)) : [];
}

/**
 * Approval is only offered once every document is verified — the same rule
 * the API enforces (it would reject the request otherwise).
 */
export function canApprove(t: Pick<Technician, 'documents' | 'status'>): boolean {
  return (
    t.status !== 'active' &&
    t.documents.length > 0 &&
    t.documents.every((d) => d.status === 'verified')
  );
}
