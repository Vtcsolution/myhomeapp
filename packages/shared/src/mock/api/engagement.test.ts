/**
 * Customer engagement served by the simulated API: notifications that follow
 * booking changes, the simulated wallet statement, chat and support tickets.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { MINUTE_MS } from '../../domain/time';
import type { BookingSelections } from '../../types';
import { DEMO_ACCOUNTS } from '../data/people';
import { createMockApi, type MockApi } from './createMockApi';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
const AC: BookingSelections = { options: { 'ac-type': 'split' }, units: 1, addOnIds: [] };

let clock = NOW;
let api: MockApi;

async function signIn() {
  const c = await api.auth.requestOtp(DEMO_ACCOUNTS.customerPhone, 'customer');
  await api.auth.verifyOtp(c.requestId, '1234');
}

async function bookTomorrow(paymentMethod: 'knet' | 'cash' | 'wallet' = 'knet') {
  for (const date of await api.bookings.getBookableDates()) {
    const slot = (
      await api.bookings.getAvailableSlots({
        serviceId: 'svc-ac-cleaning',
        selections: AC,
        addressId: 'adr-01-home',
        date,
      })
    ).find((s) => s.available && Date.parse(s.start) > NOW + 24 * 60 * MINUTE_MS);
    if (slot) {
      return api.bookings.create({
        serviceId: 'svc-ac-cleaning',
        selections: AC,
        addressId: 'adr-01-home',
        slotStart: slot.start,
        paymentMethod,
      });
    }
  }
  throw new Error('no slot');
}

beforeEach(async () => {
  clock = NOW;
  api = createMockApi({
    now: () => clock,
    latency: 0,
    autoConfirmAfterSec: null,
    simulatedReplyAfterSec: 6,
  });
  await signIn();
});

describe('notifications follow booking changes', () => {
  it('announces a new booking, a reschedule and a cancellation with refund', async () => {
    const booking = await bookTomorrow('knet');
    const slots = await api.bookings.getRescheduleSlots(
      booking.id,
      booking.scheduledStart.slice(0, 10),
    );
    const other = slots.find((s) => s.available && s.start !== booking.scheduledStart);
    expect(other).toBeDefined();
    await api.bookings.reschedule(booking.id, other!.start);
    await api.bookings.cancel(booking.id, 'Plans changed');

    const titles = (await api.notifications.list())
      .filter((n) => n.bookingId === booking.id)
      .map((n) => n.title.en);
    expect(titles).toEqual(
      expect.arrayContaining([
        'Booking received',
        'Booking rescheduled',
        'Booking cancelled',
        'Refund processed (simulated)',
      ]),
    );
    const refund = (await api.notifications.list()).find(
      (n) => n.title.en === 'Refund processed (simulated)',
    );
    expect(refund?.type).toBe('payment');
    expect(refund?.body.en).toContain('No real money was moved');
  });

  it('updates unread counts and marks everything read', async () => {
    await bookTomorrow('cash');
    expect(await api.notifications.unreadCount()).toBeGreaterThan(0);
    const first = (await api.notifications.list()).find((n) => !n.read)!;
    const before = await api.notifications.unreadCount();
    await api.notifications.markRead(first.id);
    expect(await api.notifications.unreadCount()).toBe(before - 1);
    await api.notifications.markAllRead();
    expect(await api.notifications.unreadCount()).toBe(0);
  });
});

describe('simulated wallet statement', () => {
  it('gives every movement a reference, a status and its booking reference', async () => {
    const booking = await bookTomorrow('wallet');
    await api.bookings.cancel(booking.id, 'Plans changed');
    const wallet = await api.account.getWallet();
    for (const t of wallet.transactions) {
      expect(t.reference).toMatch(/^WT-\d{6,}$/);
      expect(t.status).toBe('completed');
    }
    const related = wallet.transactions.filter((t) => t.bookingId === booking.id);
    expect(related.map((t) => t.type).sort()).toEqual(['payment', 'refund']);
    expect(related.every((t) => t.bookingReference === booking.reference)).toBe(true);
    expect(related.reduce((sum, t) => sum + t.amount, 0)).toBe(0);
  });

  it('lists movements newest first', async () => {
    const { transactions } = await api.account.getWallet();
    const times = transactions.map((t) => Date.parse(t.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});

describe('chat with the professional (simulated)', () => {
  it('sends a message and receives an automatic, clearly marked reply after the delay', async () => {
    const [thread] = await api.chat.listThreads();
    expect(thread).toBeDefined();
    await api.chat.markRead(thread!.id);
    await api.chat.sendMessage(thread!.id, 'Please call when you arrive.');
    let messages = await api.chat.getMessages(thread!.id);
    expect(messages.at(-1)?.sender).toBe('customer');

    clock += 5_000;
    expect((await api.chat.getMessages(thread!.id)).at(-1)?.sender).toBe('customer');

    clock += 2_000;
    messages = await api.chat.getMessages(thread!.id);
    const reply = messages.at(-1)!;
    expect(reply.sender).toBe('technician');
    expect(reply.text).toContain('Automatic demo reply');
    expect((await api.chat.getThread(thread!.id)).unread).toBe(1);
    const notification = (await api.notifications.list())[0]!;
    expect(notification.type).toBe('chat');
    expect(notification.threadId).toBe(thread!.id);
  });

  it('rejects empty messages', async () => {
    const [thread] = await api.chat.listThreads();
    await expect(api.chat.sendMessage(thread!.id, '   ')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('support tickets (simulated customer care)', () => {
  it('creates a ticket linked to a booking and acknowledges it automatically', async () => {
    const [booking] = await api.bookings.list('upcoming');
    const ticket = await api.support.createTicket({
      subject: 'Change of access instructions',
      category: 'booking',
      message: 'The gate code has changed.',
      bookingId: booking!.id,
    });
    expect(ticket.reference).toMatch(/^T-\d+$/);
    expect(ticket.status).toBe('open');
    expect((await api.support.listTickets())[0]?.id).toBe(ticket.id);

    clock += 6_000;
    const updated = await api.support.getTicket(ticket.id);
    expect(updated.status).toBe('in_progress');
    expect(updated.messages.at(-1)?.from).toBe('agent');
    expect(updated.messages.at(-1)?.text).toContain('Automatic demo reply');
    const notification = (await api.notifications.list())[0]!;
    expect(notification.ticketId).toBe(ticket.id);
    expect(notification.bookingId).toBe(booking!.id);
  });

  it('reopens a resolved ticket when the customer replies', async () => {
    const resolved = (await api.support.listTickets()).find((t) => t.status === 'resolved');
    expect(resolved).toBeDefined();
    const reopened = await api.support.reply(resolved!.id, 'The issue happened again.');
    expect(reopened.status).toBe('open');
  });

  it('validates the subject and message', async () => {
    await expect(
      api.support.createTicket({ subject: 'x', category: 'other', message: 'Help' }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      api.support.createTicket({ subject: 'Valid subject', category: 'other', message: ' ' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('never replies when the simulation is disabled', async () => {
    api = createMockApi({ now: () => clock, latency: 0, simulatedReplyAfterSec: null });
    await signIn();
    const ticket = await api.support.createTicket({
      subject: 'Invoice copy',
      category: 'payment',
      message: 'Please send an invoice.',
    });
    clock += 60_000;
    expect((await api.support.getTicket(ticket.id)).messages).toHaveLength(1);
  });
});
