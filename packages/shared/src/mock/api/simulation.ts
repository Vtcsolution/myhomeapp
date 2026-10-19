/**
 * Demo replies. A single-device demo has nobody on the other side of a chat or
 * support ticket, so the simulation answers after a short delay. Every reply
 * says that it is automatic — it never pretends to be a real person typing.
 */
import { toMs } from '../../domain/time';
import type { ID, Locale } from '../../types';
import { type MockContext, notify } from './context';

const CHAT_REPLY: Record<Locale, string> = {
  en: 'Thanks for your message — noted. (Automatic demo reply)',
  ar: 'شكراً على رسالتك، تم الاطلاع عليها. (رد تلقائي تجريبي)',
};

const ticketReply = (reference: string): Record<Locale, string> => ({
  en: `Thank you for contacting customer care. A specialist is reviewing request ${reference} and will reply here. (Automatic demo reply)`,
  ar: `شكراً لتواصلك مع خدمة العملاء. يراجع أحد المختصين الطلب ${reference} وسيرد هنا. (رد تلقائي تجريبي)`,
});

/** Queues a reply unless one is already waiting for the same conversation. */
export function scheduleReply(ctx: MockContext, kind: 'chat' | 'ticket', targetId: ID): void {
  if (ctx.replyDelaySec === null) return;
  const queue = (ctx.state.simulatedReplies ??= []);
  if (queue.some((r) => r.kind === kind && r.targetId === targetId)) return;
  queue.push({
    kind,
    targetId,
    dueAt: new Date(ctx.now() + ctx.replyDelaySec * 1000).toISOString(),
  });
}

function localeOfCustomer(ctx: MockContext, id: ID): Locale {
  return ctx.state.customers.find((c) => c.id === id)?.preferredLocale ?? 'en';
}

function replyInChat(ctx: MockContext, threadId: ID): void {
  const thread = ctx.state.chatThreads.find((t) => t.id === threadId);
  if (!thread) return;
  const technician = ctx.state.technicians.find((t) => t.id === thread.technicianId);
  const text = CHAT_REPLY[localeOfCustomer(ctx, thread.customerId)];
  const message = {
    id: ctx.nextId('msg'),
    threadId,
    sender: 'technician' as const,
    text,
    createdAt: ctx.nowISO(),
  };
  ctx.state.chatMessages.push(message);
  thread.lastMessageAt = message.createdAt;
  thread.lastMessagePreview = text;
  thread.unreadForCustomer += 1;
  notify(
    ctx,
    'customer',
    thread.customerId,
    'chat',
    technician
      ? {
          en: `New message from ${technician.fullName.en}`,
          ar: `رسالة جديدة من ${technician.fullName.ar}`,
        }
      : { en: 'New message', ar: 'رسالة جديدة' },
    { en: CHAT_REPLY.en, ar: CHAT_REPLY.ar },
    thread.bookingId,
    { threadId },
  );
}

function replyToTicket(ctx: MockContext, ticketId: ID): void {
  const ticket = ctx.state.tickets.find((t) => t.id === ticketId);
  if (!ticket || ticket.status === 'closed') return;
  const locale =
    ticket.requesterRole === 'customer' ? localeOfCustomer(ctx, ticket.requesterId) : 'en';
  ticket.messages.push({
    id: ctx.nextId('tkm'),
    from: 'agent',
    text: ticketReply(ticket.reference)[locale],
    createdAt: ctx.nowISO(),
  });
  if (ticket.status === 'open') ticket.status = 'in_progress';
  ticket.updatedAt = ctx.nowISO();
  notify(
    ctx,
    ticket.requesterRole,
    ticket.requesterId,
    'system',
    { en: 'Customer care replied', ar: 'ردّت خدمة العملاء' },
    {
      en: `${ticket.reference} · ${ticket.subject}`,
      ar: `${ticket.reference} · ${ticket.subject}`,
    },
    ticket.bookingId,
    { ticketId },
  );
}

/** Posts every reply that is due. Returns true when state changed. */
export function runSimulatedReplies(ctx: MockContext): boolean {
  const queue = ctx.state.simulatedReplies;
  if (!queue?.length) return false;
  const now = ctx.now();
  const due = queue.filter((r) => toMs(r.dueAt) <= now);
  if (!due.length) return false;
  ctx.state.simulatedReplies = queue.filter((r) => toMs(r.dueAt) > now);
  for (const reply of due) {
    if (reply.kind === 'chat') replyInChat(ctx, reply.targetId);
    else replyToTicket(ctx, reply.targetId);
  }
  return true;
}
