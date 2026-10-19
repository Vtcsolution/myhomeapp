import { type Customer, isApiError, type Locale } from '@myhome/shared';
import { router } from 'expo-router';
import { Lock } from '@/components/ui/icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useCustomerProfile, useUpdateProfile } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { validateProfile } from '@/lib/profileForm';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Account → Personal details: name, email and preferred language. */
export default function ProfileScreen() {
  const { t } = useLocale();
  const profile = useCustomerProfile();
  const header = (
    <ScreenHeader
      back
      fallbackHref="/customer/account"
      title={t('personal.title')}
      subtitle={t('personal.subtitle')}
    />
  );
  if (profile.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={4} height={64} />
      </Screen>
    );
  }
  if (profile.isError) {
    return (
      <Screen header={header}>
        <ErrorState onRetry={() => void profile.refetch()} />
      </Screen>
    );
  }
  return <ProfileForm key={profile.data.id} customer={profile.data} header={header} />;
}

function ProfileForm({ customer, header }: { customer: Customer; header: React.ReactNode }) {
  const { t, locale, setLocale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const update = useUpdateProfile();
  const [fullName, setFullName] = useState(customer.fullName);
  const [email, setEmail] = useState(customer.email ?? '');
  const [language, setLanguage] = useState<Locale>(locale);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = submitted ? validateProfile({ fullName, email }) : {};
  const dirty =
    fullName.trim() !== customer.fullName ||
    email.trim() !== (customer.email ?? '') ||
    language !== locale;

  const save = () => {
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(validateProfile({ fullName, email })).length) return;
    update.mutate(
      { fullName: fullName.trim(), email: email.trim(), preferredLocale: language },
      {
        onSuccess: () => {
          if (language !== locale) setLocale(language);
          show(t('personal.saved'), 'success');
          if (router.canGoBack()) router.back();
        },
        onError: (error) => setServerError(isApiError(error) ? error.message : t('errors.generic')),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={header}
        footer={
          <Button
            label={t('personal.save')}
            fullWidth
            disabled={!dirty}
            loading={update.isPending}
            onPress={save}
          />
        }
      >
        <Card>
          <View style={styles.identity}>
            <Avatar name={fullName || customer.fullName} size={56} />
            <View style={styles.flex}>
              <Text variant="title3" numberOfLines={1}>
                {fullName.trim() || customer.fullName}
              </Text>
              <Text variant="caption" tone="muted">
                {t('personal.memberSince', { date: f.date(customer.createdAt, 'medium') })}
              </Text>
            </View>
          </View>
        </Card>

        <TextField
          label={t('personal.fullName')}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          maxLength={80}
          error={errors.fullName ? t('errors.invalidName') : undefined}
        />
        <TextField
          label={t('personal.email')}
          hint={t('personal.emailHint')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          ltr
          maxLength={120}
          error={errors.email ? t('errors.invalidEmail') : undefined}
        />

        <View style={styles.group}>
          <Text variant="captionStrong" tone="secondary">
            {t('personal.phone')}
          </Text>
          <View
            style={[
              styles.locked,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text variant="bodyStrong" style={styles.phone}>
              {f.phone(customer.phone)}
            </Text>
            <Lock size={16} color={colors.textMuted} strokeWidth={1.75} />
          </View>
          <Text variant="caption" tone="muted">
            {t('personal.phoneLocked')}
          </Text>
        </View>

        <View style={styles.group}>
          <Text variant="captionStrong" tone="secondary">
            {t('personal.language')}
          </Text>
          <SegmentedControl<Locale>
            accessibilityLabel={t('personal.language')}
            value={language}
            onChange={setLanguage}
            segments={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
          <Text variant="caption" tone="muted">
            {t('personal.languageHint')}
          </Text>
        </View>

        {serverError ? (
          <Text variant="callout" tone="danger" accessibilityLiveRegion="polite">
            {serverError}
          </Text>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  group: { gap: space.sm },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  phone: { writingDirection: 'ltr' },
});
