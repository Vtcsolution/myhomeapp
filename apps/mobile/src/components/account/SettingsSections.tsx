import type { Locale } from '@myhome/shared';
import { router } from 'expo-router';
import { Globe, Info, LogOut, RotateCcw, SunMoon } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { resetDemoData } from '@/services/api';
import type { ThemePreference } from '@/services/preferences';
import { space } from '@/theme/tokens';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" tone="muted" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

/** Language and appearance — shared by the customer and professional apps. */
export function PreferencesSection() {
  const { t, locale, setLocale } = useLocale();
  const { preference, setPreference } = useTheme();
  return (
    <View style={styles.section}>
      <SectionLabel>{t('account.preferences')}</SectionLabel>
      <ListGroup>
        <View style={styles.control}>
          <ListRow icon={Globe} title={t('account.language')} />
          <View style={styles.segment}>
            <SegmentedControl<Locale>
              accessibilityLabel={t('account.language')}
              value={locale}
              onChange={setLocale}
              segments={[
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'العربية' },
              ]}
            />
          </View>
        </View>
        <View style={styles.control}>
          <ListRow icon={SunMoon} title={t('account.appearance')} />
          <View style={styles.segment}>
            <SegmentedControl<ThemePreference>
              accessibilityLabel={t('account.appearance')}
              value={preference}
              onChange={setPreference}
              segments={[
                { value: 'system', label: t('account.system') },
                { value: 'light', label: t('account.light') },
                { value: 'dark', label: t('account.dark') },
              ]}
            />
          </View>
        </View>
      </ListGroup>
    </View>
  );
}

/** About, demo reset and sign-out, each with confirmation where destructive. */
export function SessionSection() {
  const { t, brandName } = useLocale();
  const { signOut } = useSession();
  const [dialog, setDialog] = useState<'signOut' | 'reset' | null>(null);
  const [busy, setBusy] = useState(false);

  const leave = async (reset: boolean) => {
    setBusy(true);
    try {
      await signOut();
      if (reset) resetDemoData();
    } finally {
      setBusy(false);
      setDialog(null);
      router.replace('/welcome');
    }
  };

  return (
    <>
      <View style={styles.section}>
        <SectionLabel>{t('account.demo')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={Info}
            title={t('account.about', { brand: brandName })}
            onPress={() => router.push('/about')}
          />
          <ListRow
            icon={RotateCcw}
            title={t('account.resetDemo')}
            onPress={() => setDialog('reset')}
          />
          <ListRow
            icon={LogOut}
            title={t('account.signOut')}
            destructive
            onPress={() => setDialog('signOut')}
          />
        </ListGroup>
      </View>
      <ConfirmDialog
        visible={dialog === 'signOut'}
        title={t('account.signOutTitle')}
        body={t('account.signOutBody')}
        confirmLabel={t('account.signOut')}
        destructive
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => void leave(false)}
      />
      <ConfirmDialog
        visible={dialog === 'reset'}
        title={t('account.resetTitle')}
        body={t('account.resetBody')}
        confirmLabel={t('account.reset')}
        destructive
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => void leave(true)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  sectionLabel: { paddingHorizontal: space.xs },
  control: { paddingBottom: space.md },
  segment: { paddingHorizontal: space.lg },
});
