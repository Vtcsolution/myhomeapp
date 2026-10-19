import { isApiError, maskKuwaitPhone } from '@myhome/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/Headers';
import { OtpInput } from '@/components/ui/OtpInput';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { api } from '@/services/api';
import { radius, space } from '@/theme/tokens';

const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const params = useLocalSearchParams<{
    requestId: string;
    phone: string;
    role: 'customer' | 'technician';
    demo?: string;
  }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const { signIn } = useSession();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const [requestId, setRequestId] = useState(params.requestId);
  const [demoCode, setDemoCode] = useState(params.demo);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const verify = useMutation({
    mutationFn: (value: string) => api.auth.verifyOtp(requestId, value),
    onSuccess: (session) => {
      signIn(session);
      router.dismissAll();
      router.replace('/');
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'OTP_INVALID') setCode('');
    },
  });

  const resend = useMutation({
    mutationFn: () => api.auth.requestOtp(params.phone, params.role),
    onSuccess: (challenge) => {
      setRequestId(challenge.requestId);
      setDemoCode(challenge.demoCode);
      setSeconds(RESEND_SECONDS);
      setCode('');
      verify.reset();
      show(t('verify.resent'), 'success');
    },
  });

  const onChange = (value: string) => {
    setCode(value);
    if (verify.isError) verify.reset();
    if (value.length === 4) verify.mutate(value);
  };

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/sign-in"
          title={t('verify.title')}
          subtitle={t('verify.subtitle', { phone: maskKuwaitPhone(params.phone) })}
        />
      }
    >
      <View style={styles.otp}>
        <OtpInput
          value={code}
          onChange={onChange}
          error={verify.isError}
          disabled={verify.isPending}
          accessibilityLabel={t('verify.title')}
        />
        {verify.isError ? (
          <Text variant="callout" tone="danger" align="center" accessibilityLiveRegion="polite">
            {errorMessage(verify.error)}
          </Text>
        ) : null}
      </View>

      {demoCode ? (
        <View style={[styles.hint, { backgroundColor: colors.accentSoft }]}>
          <KeyRound size={16} color={colors.accent} strokeWidth={1.75} />
          <Text variant="calloutStrong" tone="accent">
            {t('verify.demoHint', { code: demoCode })}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {seconds > 0 ? (
          <Text variant="callout" tone="muted" align="center">
            {t('verify.resendIn', { seconds })}
          </Text>
        ) : (
          <Button
            label={t('verify.resend')}
            variant="secondary"
            size="md"
            loading={resend.isPending}
            onPress={() => resend.mutate()}
          />
        )}
        <Button
          label={t('verify.changeNumber')}
          variant="ghost"
          size="md"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  otp: { gap: space.lg, paddingTop: space.lg },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  actions: { gap: space.sm, alignItems: 'center' },
});
