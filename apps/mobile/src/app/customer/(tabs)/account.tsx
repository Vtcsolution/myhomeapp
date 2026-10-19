import { membershipLabels } from '@myhome/shared';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  BellRing,
  LifeBuoy,
  MapPinned,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import {
  PreferencesSection,
  SectionLabel,
  SessionSection,
} from '@/components/account/SettingsSections';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useChatThreads, useCustomerProfile, useUnreadCount, useWallet } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { customerRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

export default function AccountScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const profile = useCustomerProfile();
  const wallet = useWallet();
  const unread = useUnreadCount();
  const threads = useChatThreads();
  const unreadChats = threads.data?.reduce((sum, th) => sum + th.unread, 0) ?? 0;
  const count = (n: number | undefined) =>
    n ? <Badge label={String(n)} tone="accent" /> : undefined;

  return (
    <Screen header={<ScreenHeader title={t('account.title')} />}>
      <Card
        onPress={() => router.push(customerRoutes.profile)}
        accessibilityLabel={`${t('account.personal')}${profile.data ? `, ${profile.data.fullName}` : ''}`}
      >
        {profile.data ? (
          <View style={styles.profile}>
            <Avatar name={profile.data.fullName} size={60} />
            <View style={styles.profileText}>
              <Text variant="title2" numberOfLines={2} natural>
                {profile.data.fullName}
              </Text>
              <Text variant="callout" tone="secondary" style={styles.phone}>
                {f.phone(profile.data.phone)}
              </Text>
              <Badge
                label={t('account.member', {
                  tier: f.text(membershipLabels[profile.data.membership]),
                })}
                tone="accent"
              />
            </View>
            <DirectionalIcon
              icon={ChevronRight}
              size={20}
              color={colors.textMuted}
              strokeWidth={1.75}
            />
          </View>
        ) : (
          <View style={styles.profile}>
            <Skeleton width={60} height={60} rounded={30} />
            <View style={styles.profileText}>
              <Skeleton width={160} height={20} />
              <Skeleton width={120} height={14} />
            </View>
          </View>
        )}
      </Card>

      <View style={styles.section}>
        <SectionLabel>{t('account.section')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={UserRound}
            title={t('account.personal')}
            onPress={() => router.push(customerRoutes.profile)}
          />
          <ListRow
            icon={Wallet}
            title={t('account.wallet')}
            trailing={wallet.data ? f.money(wallet.data.balance) : undefined}
            onPress={() => router.push(customerRoutes.wallet)}
          />
          <ListRow
            icon={MapPinned}
            title={t('account.addresses')}
            trailing={profile.data ? String(profile.data.addresses.length) : undefined}
            onPress={() => router.push(customerRoutes.addresses)}
          />
          <ListRow
            icon={Bell}
            title={t('account.notifications')}
            trailing={count(unread.data)}
            onPress={() => router.push(customerRoutes.notifications)}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <SectionLabel>{t('account.supportSection')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={LifeBuoy}
            title={t('account.help')}
            onPress={() => router.push(customerRoutes.support)}
          />
          <ListRow
            icon={MessagesSquare}
            title={t('account.messages')}
            trailing={count(unreadChats)}
            onPress={() => router.push(customerRoutes.messages)}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <SectionLabel>{t('account.settingsSection')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={BellRing}
            title={t('account.notificationSettings')}
            onPress={() => router.push(customerRoutes.notificationSettings)}
          />
          <ListRow
            icon={ShieldCheck}
            title={t('account.security')}
            onPress={() => router.push(customerRoutes.security)}
          />
        </ListGroup>
      </View>

      <PreferencesSection />
      <SessionSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  profileText: { flex: 1, gap: space.xs },
  phone: { writingDirection: 'ltr' },
  section: { gap: space.sm },
});
