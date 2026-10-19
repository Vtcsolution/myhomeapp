import {
  type SupportTicket,
  type TicketCategory,
  ticketCategoryLabels,
  ticketStatusLabels,
  ticketStatusTone,
} from '@myhome/shared';
import {
  CalendarCheck,
  CircleHelp,
  type LucideIcon,
  Receipt,
  Smartphone,
  UserRound,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export const TICKET_CATEGORIES: TicketCategory[] = [
  'booking',
  'payment',
  'technician',
  'app',
  'other',
];

export const categoryIcon: Record<TicketCategory, LucideIcon> = {
  booking: CalendarCheck,
  payment: Receipt,
  technician: UserRound,
  app: Smartphone,
  other: CircleHelp,
};

export function TicketStatusBadge({ status }: { status: SupportTicket['status'] }) {
  const f = useFormat();
  return <Badge label={f.text(ticketStatusLabels[status])} tone={ticketStatusTone[status]} />;
}

/** A support request in the "Your requests" list. */
export function TicketCard({
  ticket,
  bookingReference,
  onPress,
}: {
  ticket: SupportTicket;
  bookingReference?: string;
  onPress: () => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const Icon = categoryIcon[ticket.category];
  const last = ticket.messages[ticket.messages.length - 1];
  return (
    <Card onPress={onPress} accessibilityLabel={`${ticket.reference}, ${ticket.subject}`}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Icon size={18} color={colors.accent} strokeWidth={1.75} />
        </View>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" numberOfLines={1} natural style={styles.title}>
              {ticket.subject}
            </Text>
            <TicketStatusBadge status={ticket.status} />
          </View>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {f.text(ticketCategoryLabels[ticket.category])}
            {bookingReference ? ` · ${t('support.related', { reference: bookingReference })}` : ''}
          </Text>
          {last ? (
            <Text variant="callout" tone="secondary" numberOfLines={2} natural>
              {last.text}
            </Text>
          ) : null}
          <Text variant="caption" tone="muted">
            {ticket.reference} · {t('support.updated', { time: f.relative(ticket.updatedAt) })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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
});
