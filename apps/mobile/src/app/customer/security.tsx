import { router } from 'expo-router';
import { KeyRound, LogOut, ShieldCheck, Smartphone } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCustomerProfile } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Account → Account & security: how sign-in works, this session, safety tips, sign out. */
export default function SecurityScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { session, signOut } = useSession();
  const profile = useCustomerProfile();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
      setConfirming(false);
      router.replace('/welcome');
    }
  };

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/customer/account"
          title={t('security.title')}
          subtitle={t('security.subtitle')}
        />
      }
    >
      <Card>
        <Item
          icon={KeyRound}
          title={t('security.signIn')}
          value={
            profile.data
              ? t('security.signInValue', {
                  // Keep the number on one line.
                  phone: f.phone(profile.data.phone).replace(/ /g, ' '),
                })
              : ''
          }
          body={t('security.signInBody')}
        />
        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        <Item
          icon={Smartphone}
          title={t('security.session')}
          value={
            session ? t('security.sessionValue', { date: f.date(session.expiresAt, 'medium') }) : ''
          }
        />
      </Card>

      <Card tone="muted">
        <View style={styles.tipsHead}>
          <ShieldCheck size={18} color={colors.success} strokeWidth={1.75} />
          <Text variant="bodyStrong">{t('security.tips')}</Text>
        </View>
        <View style={styles.tips}>
          {[t('security.tipCode'), t('security.tipPayment')].map((tip) => (
            <View key={tip} style={styles.tip}>
              <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
              <Text variant="callout" tone="secondary" style={styles.flex}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <DemoNotice text={t('security.demoNote')} />

      <Button
        label={t('security.signOut')}
        icon={LogOut}
        variant="secondary"
        fullWidth
        onPress={() => setConfirming(true)}
      />

      <ConfirmDialog
        visible={confirming}
        title={t('account.signOutTitle')}
        body={t('account.signOutBody')}
        confirmLabel={t('account.signOut')}
        destructive
        loading={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void leave()}
      />
    </Screen>
  );
}

function Item({
  icon: Icon,
  title,
  value,
  body,
}: {
  icon: typeof KeyRound;
  title: string;
  value: string;
  body?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.item}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon size={18} color={colors.accent} strokeWidth={1.75} />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {title}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
        {body ? (
          <Text variant="caption" tone="secondary">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: space.md },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tips: { gap: space.sm, marginTop: space.md },
  tip: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
});
