/**
 * Booking filters live in the URL so they survive navigation, reloads and can
 * be shared as links (e.g. alerts link to a pre-filtered list).
 */
import type { AdminBookingQuery, BookingSort, BookingStatus } from '@myhome/shared';

export const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
];

export const BOOKING_SORTS: BookingSort[] = [
  'scheduled_desc',
  'scheduled_asc',
  'created_desc',
  'total_desc',
];

export interface BookingFilters {
  q: string;
  status: BookingStatus[];
  categoryId: string;
  technicianId: string;
  from: string;
  to: string;
  sort: BookingSort;
  page: number;
}

export const emptyFilters: BookingFilters = {
  q: '',
  status: [],
  categoryId: '',
  technicianId: '',
  from: '',
  to: '',
  sort: 'scheduled_desc',
  page: 1,
};

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function parseBookingFilters(params: URLSearchParams): BookingFilters {
  const status = params
    .getAll('status')
    .filter((s): s is BookingStatus => (BOOKING_STATUSES as string[]).includes(s));
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    status: [...new Set(status)],
    categoryId: params.get('category') ?? '',
    technicianId: params.get('technician') ?? '',
    from: isDate(params.get('from')) ? params.get('from')! : '',
    to: isDate(params.get('to')) ? params.get('to')! : '',
    sort: (BOOKING_SORTS as string[]).includes(sort ?? '')
      ? (sort as BookingSort)
      : 'scheduled_desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Only non-default values are written, keeping links short. */
export function toSearchParams(filters: BookingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  filters.status.forEach((s) => params.append('status', s));
  if (filters.categoryId) params.set('category', filters.categoryId);
  if (filters.technicianId) params.set('technician', filters.technicianId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.sort !== 'scheduled_desc') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function toBookingQuery(filters: BookingFilters, pageSize: number): AdminBookingQuery {
  return {
    page: filters.page,
    pageSize,
    sort: filters.sort,
    ...(filters.q ? { search: filters.q } : {}),
    ...(filters.status.length ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.technicianId ? { technicianId: filters.technicianId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  };
}

export function hasActiveFilters(filters: BookingFilters): boolean {
  return (
    !!filters.q ||
    filters.status.length > 0 ||
    !!filters.categoryId ||
    !!filters.technicianId ||
    !!filters.from ||
    !!filters.to
  );
}
