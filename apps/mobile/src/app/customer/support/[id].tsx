import { isApiError, ticketCategoryLabels } from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, SearchX } from '@/components/ui/icons';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { type BubbleMessage, Composer, MessageBubble } from '@/components/chat/Conversation';
import { TicketStatusBadge } from '@/components/support/SupportParts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useCustomerBookings, useReplyToTicket, useTicket } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { radius, space } from '@/theme/tokens';

/** A support request with its conversation and a reply box. */
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const ticket = useTicket(id);
  const bookings = useCustomerBookings('all');
  const reply = useReplyToTicket(id ?? '');

  const data = ticket.data;
  const header = (
    <ScreenHeader
      back
      fallbackHref="/customer/support"
      title={data ? t('ticket.title', { reference: data.reference }) : t('support.title')}
      subtitle={data?.subject}
    />
  );

  if (ticket.isPending) {
    return (
      <Screen header={header}>
        <Skeleton height={110} rounded={radius.xl} />
        <SkeletonList count={2} height={80} />
      </Screen>
    );
  }
  if (ticket.isError) {
    return (
      <Screen header={header}>
        {isApiError(ticket.error) && ticket.error.code === 'NOT_FOUND' ? (
          <EmptyState icon={SearchX} title={t('ticket.notFound')} />
        ) : (
          <ErrorState onRetry={() => void ticket.refetch()} />
        )}
      </Screen>
    );
  }

  const booking = bookings.data?.find((b) => b.id === data!.bookingId);
  const messages: BubbleMessage[] = data!.messages.map((m) => ({
    id: m.id,
    side: m.from === 'requester' ? 'mine' : 'theirs',
    author: m.from === 'requester' ? t('ticket.you') : t('ticket.agent'),
    text: m.text,
    createdAt: m.createdAt,
  }));
  const closed = data!.status === 'resolved' || data!.status === 'closed';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={header}
        stickToEnd
        footer={
          <View style={styles.footer}>
            {closed ? (
              <Text variant="caption" tone="muted" align="center">
                {t('ticket.reopenNote')}
              </Text>
            ) : null}
            <Composer
              placeholder={t('ticket.reply')}
              sendLabel={t('ticket.send')}
              sending={reply.isPending}
              maxLength={2000}
              onSend={(text, clear) =>
                reply.mutate(text, {
                  onSuccess: clear,
                  onError: (e) => show(errorMessage(e)),
                })
              }
            />
          </View>
        }
      >
        <Card>
          <View style={styles.meta}>
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">
                {f.text(ticketCategoryLabels[data!.category])} ·{' '}
                {t('ticket.opened', { date: f.date(data!.createdAt, 'medium') })}
              </Text>
              <Text variant="bodyStrong" natural>
                {data!.subject}
              </Text>
            </View>
            <TicketStatusBadge status={data!.status} />
          </View>
          {booking ? (
            <Button
              label={t('ticket.viewBooking', { reference: booking.reference })}
              icon={CalendarCheck}
              variant="secondary"
              size="sm"
              style={styles.bookingLink}
              onPress={() => router.push(customerRoutes.booking(booking.id))}
            />
          ) : null}
        </Card>

        <DemoNotice text={t('support.demoNote')} />

        <View style={styles.thread} accessibilityRole="list">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  footer: { gap: space.xs },
  meta: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  bookingLink: { marginTop: space.md, alignSelf: 'flex-start' },
  thread: { gap: space.md },
});
