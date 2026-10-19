import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useUpdateProfile } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ProfileSetupScreen() {
  const { t } = useLocale();
  const { session, completeProfile } = useSession();
  const errorMessage = useErrorMessage();
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!session || session.role !== 'customer') return <Redirect href="/" />;

  const nameError = submitted && name.trim().length < 2 ? t('errors.invalidName') : null;
  const emailError =
    submitted && email.trim() && !EMAIL.test(email.trim()) ? t('errors.invalidEmail') : null;

  const submit = () => {
    setSubmitted(true);
    if (name.trim().length < 2 || (email.trim() && !EMAIL.test(email.trim()))) return;
    update.mutate(
      { fullName: name, ...(email.trim() ? { email: email.trim() } : {}) },
      {
        onSuccess: () => {
          completeProfile();
          router.replace('/customer');
        },
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
          <ScreenHeader title={t('profileSetup.title')} subtitle={t('profileSetup.subtitle')} />
        }
        footer={
          <Button
            label={t('profileSetup.finish')}
            fullWidth
            loading={update.isPending}
            onPress={submit}
          />
        }
      >
        <TextField
          label={t('profileSetup.nameLabel')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
          error={nameError ?? (update.isError ? errorMessage(update.error) : null)}
        />
        <TextField
          label={t('profileSetup.emailLabel')}
          value={email}
          onChangeText={setEmail}
          ltr
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={submit}
          error={emailError}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
