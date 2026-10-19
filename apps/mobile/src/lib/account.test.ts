/** Account, wallet, notifications and support helpers (stage 5). */
import type { AppNotification, WalletTransactionView } from '@myhome/shared';
import { describe, expect, it } from 'vitest';
import { groupNotifications, notificationTarget } from './notifications';
import { validateProfile } from './profileForm';
import { parseCategory, validateTicket } from './ticketForm';
import { filterTransactions, groupByMonth } from './wallet';

const tx = (id: string, amount: number, createdAt: string): WalletTransactionView => ({
  id,
  customerId: 'cus-01',
  type: amount > 0 ? 'refund' : 'payment',
  amount,
  description: { en: id, ar: id },
  createdAt,
  reference: `WT-${id.padStart(6, '0')}`,
  status: 'completed',
});

const note = (
  id: string,
  createdAt: string,
  extra: Partial<AppNotification> = {},
): AppNotification => ({
  id,
  recipientRole: 'customer',
  recipientId: 'cus-01',
  type: 'booking_update',
  title: { en: id, ar: id },
  body: { en: id, ar: id },
  read: false,
  createdAt,
  ...extra,
});

describe('wallet statement', () => {
  const list = [
    tx('3', 5_000, '2026-10-18T10:00:00.000Z'),
    tx('2', -12_000, '2026-10-02T10:00:00.000Z'),
    // 30 Sep 22:30 UTC is already 1 Oct in Kuwait.
    tx('1', -3_000, '2026-09-30T22:30:00.000Z'),
    tx('0', 8_000, '2026-09-12T10:00:00.000Z'),
  ];

  it('filters credits and debits', () => {
    expect(filterTransactions(list, 'credits').map((t) => t.id)).toEqual(['3', '0']);
    expect(filterTransactions(list, 'debits').map((t) => t.id)).toEqual(['2', '1']);
    expect(filterTransactions(list, 'all')).toHaveLength(4);
  });

  it('groups by Kuwait calendar month, newest first', () => {
    const groups = groupByMonth(list);
    expect(groups.map((g) => g.month)).toEqual(['2026-10', '2026-09']);
    expect(groups[0]!.transactions.map((t) => t.id)).toEqual(['3', '2', '1']);
  });

  it('returns no groups for an empty statement', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe('notifications inbox', () => {
  const now = Date.parse('2026-10-19T09:00:00.000Z'); // 12:00 Kuwait
  const list = [
    note('a', '2026-10-19T06:00:00.000Z'),
    note('b', '2026-10-18T20:59:00.000Z', { read: true }), // 23:59 on the 18th in Kuwait
    note('c', '2026-10-18T21:30:00.000Z'), // 00:30 on the 19th in Kuwait
    note('d', '2026-10-10T08:00:00.000Z', { read: true }),
  ];

  it('groups into today, yesterday and earlier by Kuwait day', () => {
    const groups = groupNotifications(list, 'all', now);
    expect(groups.map((g) => [g.bucket, g.items.map((n) => n.id)])).toEqual([
      ['today', ['a', 'c']],
      ['yesterday', ['b']],
      ['earlier', ['d']],
    ]);
  });

  it('shows only unread items in the unread filter and drops empty groups', () => {
    const groups = groupNotifications(list, 'unread', now);
    expect(groups.map((g) => g.bucket)).toEqual(['today']);
  });

  it('opens the conversation, the request or the booking', () => {
    expect(notificationTarget(note('x', '', { threadId: 't1', bookingId: 'b1' }))).toEqual({
      kind: 'chat',
      id: 't1',
    });
    expect(notificationTarget(note('x', '', { ticketId: 'k1', bookingId: 'b1' }))).toEqual({
      kind: 'ticket',
      id: 'k1',
    });
    expect(notificationTarget(note('x', '', { bookingId: 'b1' }))).toEqual({
      kind: 'booking',
      id: 'b1',
    });
    expect(notificationTarget(note('x', ''))).toBeNull();
  });
});

describe('support request form', () => {
  it('requires a 3–120 character subject and a message', () => {
    expect(validateTicket({ category: 'other', subject: 'Hi', message: 'x' })).toEqual({
      subject: 'invalid',
    });
    expect(validateTicket({ category: 'other', subject: 'Gate code', message: '   ' })).toEqual({
      message: 'invalid',
    });
    expect(
      validateTicket({ category: 'other', subject: 'x'.repeat(121), message: 'Help' }).subject,
    ).toBe('invalid');
    expect(
      validateTicket({ category: 'booking', subject: 'Gate code', message: 'New code' }),
    ).toEqual({});
  });

  it('reads the topic from the route and defaults sensibly', () => {
    expect(parseCategory('payment', false)).toBe('payment');
    expect(parseCategory('nonsense', true)).toBe('booking');
    expect(parseCategory(undefined, false)).toBe('other');
  });
});

describe('personal details form', () => {
  it('validates the name and an optional email', () => {
    expect(validateProfile({ fullName: 'Noura Al-Kandari', email: '' })).toEqual({});
    expect(validateProfile({ fullName: ' N ', email: '' })).toEqual({ fullName: 'invalid' });
    expect(validateProfile({ fullName: 'Noura', email: 'noura@' })).toEqual({ email: 'invalid' });
    expect(validateProfile({ fullName: 'Noura', email: 'noura@example.com' })).toEqual({});
  });
});
