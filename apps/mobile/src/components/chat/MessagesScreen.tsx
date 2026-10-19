import { router } from 'expo-router';
import { MessagesSquare } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useChatThreads } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes, proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

/** Conversations about bookings — with professionals (customer) or customers (professional). */
export function MessagesScreen({ role }: { role: 'customer' | 'technician' }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const threads = useChatThreads();

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref={role === 'customer' ? '/customer/support' : '/pro/profile'}
          title={t('chat.title')}
          subtitle={t(role === 'customer' ? 'chat.subtitle' : 'chat.subtitlePro')}
        />
      }
      refreshing={threads.isRefetching}
      onRefresh={() => void threads.refetch()}
    >
      <DemoNotice text={t(role === 'customer' ? 'chat.demo' : 'chat.demoPro')} />
      {threads.isPending ? (
        <SkeletonList count={3} height={84} />
      ) : threads.isError ? (
        <ErrorState onRetry={() => void threads.refetch()} />
      ) : threads.data.length === 0 ? (
        <EmptyState icon={MessagesSquare} title={t('chat.emptyTitle')} body={t('chat.emptyBody')} />
      ) : (
        <View style={styles.list}>
          {threads.data.map((thread) => {
            const name = f.text(thread.counterpartName);
            return (
              <Card
                key={thread.id}
                onPress={() =>
                  router.push(
                    role === 'customer'
                      ? customerRoutes.chat(thread.id)
                      : proRoutes.chat(thread.id),
                  )
                }
                accessibilityLabel={`${name}, ${f.text(thread.serviceName)}, ${thread.lastMessagePreview}`}
              >
                <View style={styles.row}>
                  <Avatar name={thread.counterpartName.en} size={46} />
                  <View style={styles.texts}>
                    <View style={styles.titleRow}>
                      <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                        {name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {f.relative(thread.lastMessageAt)}
                      </Text>
                    </View>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {f.text(thread.serviceName)} · {thread.bookingReference}
                    </Text>
                    <View style={styles.titleRow}>
                      <Text
                        variant={thread.unread ? 'calloutStrong' : 'callout'}
                        tone={thread.unread ? 'primary' : 'secondary'}
                        numberOfLines={1}
                        natural
                        style={styles.flex}
                      >
                        {thread.lastMessagePreview}
                      </Text>
                      {thread.unread ? (
                        <View style={[styles.count, { backgroundColor: colors.accent }]}>
                          <Text variant="captionStrong" style={{ color: colors.onAccent }}>
                            {thread.unread}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
