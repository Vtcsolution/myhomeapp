import { isApiError, type TicketCategory, ticketCategoryLabels } from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Send } from '@/components/ui/icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { categoryIcon, TICKET_CATEGORIES } from '@/components/support/SupportParts';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useCreateTicket, useCustomerBookings } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { MESSAGE_MAX, parseCategory, SUBJECT_MAX, validateTicket } from '@/lib/ticketForm';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { space } from '@/theme/tokens';

/** Help & support → New request (optionally about a specific booking). */
export default function NewTicketScreen() {
  const params = useLocalSearchParams<{ category?: string; bookingId?: string }>();
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const bookings = useCustomerBookings('all');
  const create = useCreateTicket();
  const [category, setCategory] = useState<TicketCategory>(() =>
    parseCategory(params.category, !!params.bookingId),
  );
  const [bookingId, setBookingId] = useState<string | undefined>(params.bookingId);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateTicket({ category, subject, message }) : {};
  const recent = (bookings.data ?? [])
    .slice()
    .sort((a, b) => Date.parse(b.scheduledStart) - Date.parse(a.scheduledStart))
    .slice(0, 6);
  // A booking passed in from Booking details is listed first so it is visible as selected.
  const linked = params.bookingId
    ? bookings.data?.find((b) => b.id === params.bookingId)
    : undefined;
  const choices = linked ? [linked, ...recent.filter((b) => b.id !== linked.id)] : recent;

  const send = () => {
    setSubmitted(true);
    if (Object.keys(validateTicket({ category, subject, message })).length) return;
    create.mutate(
      {
        category,
        subject: subject.trim(),
        message: message.trim(),
        ...(bookingId ? { bookingId } : {}),
      },
      {
        onSuccess: (ticket) => {
          show(t('newTicket.sent', { reference: ticket.reference }), 'success');
          router.replace(customerRoutes.ticket(ticket.id));
        },
        onError: (e) =>
          show(isApiError(e) && e.code === 'VALIDATION' ? e.message : errorMessage(e)),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={
          <ScreenHeader
            back
            fallbackHref="/customer/support"
            title={t('newTicket.title')}
            subtitle={t('newTicket.subtitle')}
          />
        }
        footer={
          <Button
            label={t('newTicket.send')}
            icon={Send}
            fullWidth
            loading={create.isPending}
            onPress={send}
          />
        }
      >
        <View style={styles.group}>
          <Text variant="captionStrong" tone="secondary">
            {t('newTicket.category')}
          </Text>
          <View style={styles.wrap}>
            {TICKET_CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={f.text(ticketCategoryLabels[c])}
                icon={categoryIcon[c]}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </View>

        {choices.length ? (
          <View style={styles.group}>
            <Text variant="captionStrong" tone="secondary">
              {t('newTicket.booking')}
            </Text>
            <ChipRow>
              <Chip
                label={t('newTicket.none')}
                selected={!bookingId}
                onPress={() => setBookingId(undefined)}
              />
              {choices.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.reference} · ${f.text(b.service.name)}`}
                  selected={bookingId === b.id}
                  onPress={() => setBookingId(b.id)}
                />
              ))}
            </ChipRow>
          </View>
        ) : null}

        <TextField
          label={t('newTicket.subject')}
          placeholder={t('newTicket.subjectPlaceholder')}
          value={subject}
          onChangeText={setSubject}
          maxLength={SUBJECT_MAX}
          error={errors.subject ? t('newTicket.errorSubject') : undefined}
        />
        <TextField
          label={t('newTicket.message')}
          placeholder={t('newTicket.messagePlaceholder')}
          value={message}
          onChangeText={setMessage}
          maxLength={MESSAGE_MAX}
          multiline
          error={errors.message ? t('newTicket.errorMessage') : undefined}
        />
        <DemoNotice text={t('support.demoNote')} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
