import { brand, type TechnicianSummary } from '@myhome/shared';
import { MessageSquareText, Phone, Star } from '@/components/ui/icons';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

/** Assigned professional with contact actions. */
export function TechnicianCard({
  technician,
  chatThreadId,
}: {
  technician: TechnicianSummary;
  /** Conversation for this booking; Message is hidden when there is none. */
  chatThreadId?: string | null;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  return (
    <Card>
      <Text variant="captionStrong" tone="secondary" style={styles.title}>
        {t('booking.technician')}
      </Text>
      <View style={styles.row}>
        <Avatar name={technician.fullName.en} size={52} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{f.text(technician.fullName)}</Text>
          <Text variant="caption" tone="secondary">
            {f.text(technician.headline)}
            {technician.vendorName ? ` · ${f.text(technician.vendorName)}` : ''}
          </Text>
          <View style={styles.rating}>
            <Star size={13} color={colors.accent} fill={colors.accent} strokeWidth={1.5} />
            <Text variant="captionStrong">
              {technician.rating ? f.rating(technician.rating) : '—'}
            </Text>
            <Text variant="caption" tone="muted">
              ({technician.reviewsCount})
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        {chatThreadId ? (
          <Button
            label={t('booking.message')}
            icon={MessageSquareText}
            variant="secondary"
            size="sm"
            onPress={() => router.push(customerRoutes.chat(chatThreadId!))}
            style={styles.action}
          />
        ) : null}
        <Button
          label={t('booking.callCare')}
          icon={Phone}
          variant="secondary"
          size="sm"
          onPress={() => void Linking.openURL(`tel:${brand.support.phone}`)}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  action: { flexGrow: 1, flexBasis: 140 },
});
