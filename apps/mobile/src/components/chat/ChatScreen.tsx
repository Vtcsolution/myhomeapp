import { isApiError } from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { type BubbleMessage, Composer, MessageBubble } from '@/components/chat/Conversation';
import { Button } from '@/components/ui/Button';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useChatMessages, useChatThread, useMarkThreadRead, useSendMessage } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes, proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

export type ChatRole = 'customer' | 'technician';

/**
 * Simulated conversation about a booking, shared by both apps. `role` decides
 * which side's messages are "mine" and where links lead.
 */
export function ChatScreen({ role }: { role: ChatRole }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const thread = useChatThread(id);
  const messages = useChatMessages(id);
  const send = useSendMessage(id ?? '');
  const markRead = useMarkThreadRead();

  // Mark as read on open and whenever a new message arrives while open.
  const count = messages.data?.length ?? 0;
  const lastMarked = useRef(-1);
  useEffect(() => {
    if (!id || count === lastMarked.current) return;
    lastMarked.current = count;
    markRead.mutate(id);
  }, [id, count, markRead]);

  const name = thread.data ? f.text(thread.data.counterpartName) : '';
  const header = (
    <ScreenHeader
      back
      fallbackHref={role === 'customer' ? '/customer/messages' : '/pro/messages'}
      title={name || t('chat.title')}
      subtitle={
        thread.data
          ? `${f.text(thread.data.serviceName)} · ${thread.data.bookingReference}`
          : undefined
      }
    />
  );

  if (thread.isError) {
    return (
      <Screen header={header}>
        {isApiError(thread.error) && thread.error.code === 'NOT_FOUND' ? (
          <EmptyState icon={SearchX} title={t('chat.notFound')} />
        ) : (
          <ErrorState onRetry={() => void thread.refetch()} />
        )}
      </Screen>
    );
  }

  const bubbles: BubbleMessage[] = (messages.data ?? []).map((m) => ({
    id: m.id,
    side: m.sender === role ? 'mine' : m.sender === 'system' ? 'system' : 'theirs',
    author: m.sender === role ? t('chat.you') : m.sender === 'system' ? undefined : name,
    text: m.text,
    createdAt: m.createdAt,
  }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={header}
        stickToEnd
        footer={
          <Composer
            placeholder={t('chat.placeholder')}
            sendLabel={t('chat.send')}
            sending={send.isPending}
            onSend={(text, clear) =>
              send.mutate(text, {
                onSuccess: clear,
                onError: () => show(t('chat.sendFailed')),
              })
            }
          />
        }
      >
        <DemoNotice text={t(role === 'customer' ? 'chat.demo' : 'chat.demoPro')} />
        {thread.data ? (
          <Button
            label={t('chat.viewBooking')}
            variant="ghost"
            size="sm"
            style={styles.bookingLink}
            onPress={() =>
              router.push(
                role === 'customer'
                  ? customerRoutes.booking(thread.data.bookingId)
                  : proRoutes.job(thread.data.bookingId),
              )
            }
          />
        ) : null}
        {messages.isPending ? (
          <SkeletonList count={3} height={56} />
        ) : messages.isError ? (
          <ErrorState onRetry={() => void messages.refetch()} />
        ) : (
          <View style={styles.thread} accessibilityRole="list">
            {bubbles.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bookingLink: { alignSelf: 'center' },
  thread: { gap: space.md },
});
