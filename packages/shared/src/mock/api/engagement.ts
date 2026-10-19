import type { ChatApi, NotificationsApi, SupportApi } from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { toMs } from '../../domain/time';
import type { ChatThread, SupportTicket } from '../../types';
import { findThread, type MockContext, requireSession, validation } from './context';
import type { Runner } from './runner';
import { threadView } from './views';

export function createNotificationsApi(ctx: MockContext, run: Runner): NotificationsApi {
  const mine = () => {
    const session = requireSession(ctx);
    return ctx.state.notifications.filter(
      (n) => n.recipientRole === session.role && n.recipientId === session.userId,
    );
  };
  return {
    list: () => run.read(() => mine().sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))),
    unreadCount: () => run.read(() => mine().filter((n) => !n.read).length),
    markRead: (id) =>
      run.write(() => {
        const notification = mine().find((n) => n.id === id);
        if (!notification) throw new ApiError('NOT_FOUND', 'Notification not found.');
        notification.read = true;
      }),
    markAllRead: () =>
      run.write(() => {
        mine().forEach((n) => (n.read = true));
      }),
  };
}

export function createChatApi(ctx: MockContext, run: Runner): ChatApi {
  const participantThread = (
    id: string,
  ): { thread: ChatThread; role: 'customer' | 'technician' } => {
    const session = requireSession(ctx);
    const thread = findThread(ctx, id);
    if (session.role === 'customer' && thread.customerId === session.userId)
      return { thread, role: 'customer' };
    if (session.role === 'technician' && thread.technicianId === session.userId)
      return { thread, role: 'technician' };
    throw new ApiError('NOT_FOUND', 'Conversation not found.');
  };

  return {
    listThreads: () =>
      run.read(() => {
        const session = requireSession(ctx);
        if (session.role === 'admin')
          throw new ApiError('FORBIDDEN', 'Chat is available to customers and technicians.');
        return ctx.state.chatThreads
          .filter(
            (t) => (session.role === 'customer' ? t.customerId : t.technicianId) === session.userId,
          )
          .sort((a, b) => toMs(b.lastMessageAt) - toMs(a.lastMessageAt))
          .map((t) => threadView(ctx, t, session.role));
      }),

    getThread: (id) =>
      run.read(() => {
        const { thread, role } = participantThread(id);
        return threadView(ctx, thread, role);
      }),

    getMessages: (threadId) =>
      run.read(() => {
        participantThread(threadId);
        return ctx.state.chatMessages
          .filter((m) => m.threadId === threadId)
          .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
      }),

    sendMessage: (threadId, text) =>
      run.write(() => {
        const { thread, role } = participantThread(threadId);
        const body = text.trim();
        if (!body) validation('Message cannot be empty.');
        if (body.length > 1000) validation('Message is too long.');
        const message = {
          id: ctx.nextId('msg'),
          threadId,
          sender: role,
          text: body,
          createdAt: ctx.nowISO(),
        };
        ctx.state.chatMessages.push(message);
        thread.lastMessageAt = message.createdAt;
        thread.lastMessagePreview = body;
        if (role === 'customer') thread.unreadForTechnician += 1;
        else thread.unreadForCustomer += 1;
        return message;
      }),

    markRead: (threadId) =>
      run.write(() => {
        const { thread, role } = participantThread(threadId);
        if (role === 'customer') thread.unreadForCustomer = 0;
        else thread.unreadForTechnician = 0;
      }),
  };
}

export function createSupportApi(ctx: MockContext, run: Runner): SupportApi {
  const requester = () => {
    const session = requireSession(ctx);
    if (session.role === 'admin') throw new ApiError('FORBIDDEN', 'Use the admin ticket tools.');
    return { role: session.role, id: session.userId };
  };
  const ownTicket = (id: string): SupportTicket => {
    const me = requester();
    const ticket = ctx.state.tickets.find((t) => t.id === id);
    if (!ticket || ticket.requesterId !== me.id || ticket.requesterRole !== me.role) {
      throw new ApiError('NOT_FOUND', 'Ticket not found.');
    }
    return ticket;
  };

  return {
    listTickets: () =>
      run.read(() => {
        const me = requester();
        return ctx.state.tickets
          .filter((t) => t.requesterId === me.id && t.requesterRole === me.role)
          .sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
      }),

    getTicket: (id) => run.read(() => ownTicket(id)),

    createTicket: (request) =>
      run.write(() => {
        const me = requester();
        const subject = request.subject.trim();
        const message = request.message.trim();
        if (subject.length < 3 || subject.length > 120) validation('Please add a short subject.');
        if (!message || message.length > 2000) validation('Please describe the issue.');
        if (request.bookingId) {
          const booking = ctx.state.bookings.find((b) => b.id === request.bookingId);
          const owns =
            booking &&
            (me.role === 'customer' ? booking.customerId : booking.technicianId) === me.id;
          if (!owns) throw new ApiError('NOT_FOUND', 'Booking not found.');
        }
        const maxRef = ctx.state.tickets.reduce(
          (m, t) => Math.max(m, Number(t.reference.slice(2)) || 0),
          10_420,
        );
        const ticket: SupportTicket = {
          id: ctx.nextId('tkt'),
          reference: `T-${maxRef + 1}`,
          requesterRole: me.role,
          requesterId: me.id,
          subject,
          category: request.category,
          priority:
            request.category === 'payment' || request.category === 'technician' ? 'high' : 'normal',
          status: 'open',
          ...(request.bookingId ? { bookingId: request.bookingId } : {}),
          messages: [
            { id: ctx.nextId('tkm'), from: 'requester', text: message, createdAt: ctx.nowISO() },
          ],
          createdAt: ctx.nowISO(),
          updatedAt: ctx.nowISO(),
        };
        ctx.state.tickets.unshift(ticket);
        return ticket;
      }),

    reply: (id, text) =>
      run.write(() => {
        const ticket = ownTicket(id);
        const body = text.trim();
        if (!body) validation('Message cannot be empty.');
        ticket.messages.push({
          id: ctx.nextId('tkm'),
          from: 'requester',
          text: body,
          createdAt: ctx.nowISO(),
        });
        if (ticket.status === 'resolved' || ticket.status === 'closed') ticket.status = 'open';
        ticket.updatedAt = ctx.nowISO();
        return ticket;
      }),
  };
}
