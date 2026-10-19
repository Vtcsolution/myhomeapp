import type { AppNotification, NotificationType } from '@myhome/shared';
import type { Href } from 'expo-router';
import {
  BellRing,
  Briefcase,
  CalendarCheck,
  CheckCheck,
  Gift,
  Inbox,
  type LucideIcon,
  MessageSquareText,
  Receipt,
  Settings2,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import type { TKey } from '@/i18n/translate';
import { type DayBucket, groupNotifications, type NotificationFilter } from '@/lib/notifications';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const typeIcon: Record<NotificationType, LucideIcon> = {
  booking_update: CalendarCheck,
  job_offer: Briefcase,
  payment: Receipt,
  promotion: Gift,
  chat: MessageSquareText,
  system: BellRing,
};

const BUCKET_LABEL: Record<DayBucket, TKey> = {
  today: 'notifications.today',
  yesterday: 'notifications.yesterday',
  earlier: 'notifications.earlier',
};

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const f = useFormat();
  const Icon = typeIcon[notification.type];
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${notification.read ? '' : `${t('notifications.unread')}. `}${f.text(notification.title)}. ${f.text(notification.body)}`}
      style={!notification.read ? { borderColor: colors.accent } : undefined}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            { backgroundColor: notification.read ? colors.surfaceMuted : colors.accentSoft },
          ]}
        >
          <Icon
            size={18}
            color={notification.read ? colors.textMuted : colors.accent}
            strokeWidth={1.75}
          />
        </View>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" style={styles.title} numberOfLines={1}>
              {f.text(notification.title)}
            </Text>
            {!notification.read ? (
              <View style={[styles.unread, { backgroundColor: colors.accent }]} />
            ) : null}
          </View>
          <Text variant="callout" tone="secondary">
            {f.text(notification.body)}
          </Text>
          <Text variant="caption" tone="muted">
            {f.relative(notification.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/**
 * Notifications screen shared by both roles. `onOpen` handles navigation for
 * notifications that point at a booking, conversation or support request.
 */
export function NotificationsScreen({
  fallbackHref,
  onOpen,
  onOpenSettings,
}: {
  fallbackHref: Href;
  onOpen: (notification: AppNotification) => void;
  onOpenSettings?: () => void;
}) {
  const { t } = useLocale();
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const now = useNow();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const unread = query.data?.filter((n) => !n.read).length ?? 0;
  const groups = query.data ? groupNotifications(query.data, filter, now) : [];

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref={fallbackHref}
          title={t('notifications.title')}
          subtitle={unread ? t('notifications.unreadCount', { count: unread }) : undefined}
          trailing={
            onOpenSettings ? (
              <IconButton
                icon={Settings2}
                label={t('notifications.settings')}
                onPress={onOpenSettings}
              />
            ) : undefined
          }
        />
      }
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <View style={styles.toolbar}>
        <View style={styles.flex}>
          <SegmentedControl<NotificationFilter>
            accessibilityLabel={t('notifications.title')}
            value={filter}
            onChange={setFilter}
            segments={[
              { value: 'all', label: t('notifications.all') },
              { value: 'unread', label: t('notifications.unread') },
            ]}
          />
        </View>
        {unread > 0 ? (
          <Button
            label={t('notifications.markAllRead')}
            icon={CheckCheck}
            variant="ghost"
            size="sm"
            loading={markAll.isPending}
            onPress={() => markAll.mutate()}
          />
        ) : null}
      </View>

      {query.isPending ? (
        <SkeletonList count={5} height={88} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : groups.length === 0 ? (
        filter === 'unread' && query.data.length > 0 ? (
          <EmptyState
            icon={CheckCheck}
            title={t('notifications.emptyUnreadTitle')}
            body={t('notifications.emptyUnreadBody')}
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title={t('notifications.emptyTitle')}
            body={t('notifications.emptyBody')}
          />
        )
      ) : (
        groups.map((group) => (
          <View key={group.bucket} style={styles.list}>
            <Text variant="overline" tone="muted" accessibilityRole="header">
              {t(BUCKET_LABEL[group.bucket])}
            </Text>
            {group.items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onPress={() => {
                  if (!n.read) markRead.mutate(n.id);
                  onOpen(n);
                }}
              />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  list: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1 },
  unread: { width: 8, height: 8, borderRadius: 4 },
});
