import { brand, ticketCategoryLabels } from '@myhome/shared';
import { router } from 'expo-router';
import { Clock3, LifeBuoy, Mail, MessagesSquare, Phone, Plus } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';
import { categoryIcon, TICKET_CATEGORIES, TicketCard } from '@/components/support/SupportParts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useChatThreads, useCustomerBookings, useTickets } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Account → Help & support: contact options, topics, conversations and requests. */
export default function SupportScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const tickets = useTickets();
  const threads = useChatThreads();
  const bookings = useCustomerBookings('all');
  const unreadChats = threads.data?.reduce((sum, th) => sum + th.unread, 0) ?? 0;
  const referenceOf = (id?: string) => bookings.data?.find((b) => b.id === id)?.reference;

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/customer/account"
          title={t('support.title')}
          subtitle={t('support.subtitle')}
        />
      }
      refreshing={tickets.isRefetching}
      onRefresh={() => void tickets.refetch()}
      footer={
        <Button
          label={t('support.newRequest')}
          icon={Plus}
          fullWidth
          onPress={() => router.push(customerRoutes.newTicket())}
        />
      }
    >
      <Card tone="midnight">
        <View style={styles.careHead}>
          <View style={[styles.careIcon, { backgroundColor: colors.champagne }]}>
            <LifeBuoy size={18} color={colors.midnight} strokeWidth={1.75} />
          </View>
          <View style={styles.flex}>
            <Text variant="overline" style={{ color: colors.champagne }}>
              {t('support.hours')}
            </Text>
            <Text variant="bodyStrong" style={{ color: colors.onMidnight }}>
              {f.text(brand.support.hours)}
            </Text>
          </View>
          <Clock3 size={18} color={colors.champagne} strokeWidth={1.75} />
        </View>
        <View style={styles.careActions}>
          <Button
            label={t('support.call')}
            icon={Phone}
            variant="inverse"
            size="sm"
            style={styles.careAction}
            onPress={() => void Linking.openURL(`tel:${brand.support.phone}`)}
          />
          <Button
            label={t('support.email')}
            icon={Mail}
            variant="inverse"
            size="sm"
            style={styles.careAction}
            onPress={() => void Linking.openURL(`mailto:${brand.support.email}`)}
          />
        </View>
      </Card>

      <DemoNotice text={t('support.demoNote')} />

      <ListGroup>
        <ListRow
          icon={MessagesSquare}
          title={t('support.messages')}
          subtitle={t('support.messagesBody')}
          trailing={unreadChats ? <Badge label={String(unreadChats)} tone="accent" /> : undefined}
          onPress={() => router.push(customerRoutes.messages)}
        />
      </ListGroup>

      <View style={styles.section}>
        <Text variant="title3" accessibilityRole="header">
          {t('support.topics')}
        </Text>
        <View style={styles.topics}>
          {TICKET_CATEGORIES.map((category) => {
            const Icon = categoryIcon[category];
            return (
              <PressableScale
                key={category}
                accessibilityRole="button"
                accessibilityLabel={f.text(ticketCategoryLabels[category])}
                onPress={() => router.push(customerRoutes.newTicket({ category }))}
                style={[
                  styles.topic,
                  { backgroundColor: colors.surface, borderColor: colors.hairline },
                ]}
              >
                <View style={[styles.topicIcon, { backgroundColor: colors.accentSoft }]}>
                  <Icon size={18} color={colors.accent} strokeWidth={1.75} />
                </View>
                <Text variant="calloutStrong" numberOfLines={2}>
                  {f.text(ticketCategoryLabels[category])}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="title3" accessibilityRole="header">
          {t('support.yourRequests')}
        </Text>
        {tickets.isPending ? (
          <SkeletonList count={2} height={110} />
        ) : tickets.isError ? (
          <ErrorState onRetry={() => void tickets.refetch()} />
        ) : tickets.data.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title={t('support.emptyTitle')}
            body={t('support.emptyBody')}
          />
        ) : (
          tickets.data.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              bookingReference={referenceOf(ticket.bookingId)}
              onPress={() => router.push(customerRoutes.ticket(ticket.id))}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  careHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  careIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  careAction: { flexGrow: 1, flexBasis: 130 },
  section: { gap: space.md },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  topic: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 130,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  topicIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
