import { DEMO_ACCOUNTS } from '@myhome/shared/mock';
import { brand, isValidKuwaitMobile, normalizeKuwaitPhone } from '@myhome/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Briefcase, KeyRound, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { api } from '@/services/api';
import { space } from '@/theme/tokens';

type Role = 'customer' | 'technician';

/** "55550101" → "5555 0101" while typing. */
const groupDigits = (digits: string) =>
  digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;

export default function SignInScreen() {
  const params = useLocalSearchParams<{ role?: Role }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const errorMessage = useErrorMessage();
  const [role, setRole] = useState<Role>(params.role === 'technician' ? 'technician' : 'customer');
  const [digits, setDigits] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = isValidKuwaitMobile(digits);
  const request = useMutation({
    mutationFn: () => api.auth.requestOtp(digits, role),
    onSuccess: (challenge) =>
      router.push({
        pathname: '/verify',
        params: {
          requestId: challenge.requestId,
          phone: challenge.phone,
          role,
          demo: challenge.demoCode ?? '',
        },
      }),
  });

  const fieldError =
    touched && digits.length >= 8 && !valid
      ? t('auth.invalidPhone')
      : request.isError
        ? errorMessage(request.error)
        : null;

  const applyDemo = (demoRole: Role) => {
    const phone =
      demoRole === 'customer' ? DEMO_ACCOUNTS.customerPhone : DEMO_ACCOUNTS.technicianPhone;
    setRole(demoRole);
    setDigits((normalizeKuwaitPhone(phone) ?? '').slice(4));
    request.reset();
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
            fallbackHref="/welcome"
            title={t('auth.title')}
            subtitle={t('auth.subtitle')}
          />
        }
        footer={
          <Button
            label={t('common.continue')}
            fullWidth
            disabled={!valid}
            loading={request.isPending}
            onPress={() => request.mutate()}
          />
        }
      >
        <SegmentedControl<Role>
          accessibilityLabel={t('auth.title')}
          value={role}
          onChange={(next) => {
            setRole(next);
            request.reset();
          }}
          segments={[
            { value: 'customer', label: t('auth.customer') },
            { value: 'technician', label: t('auth.professional') },
          ]}
        />

        <TextField
          label={t('auth.phoneLabel')}
          prefix="+965"
          ltr
          value={groupDigits(digits)}
          onChangeText={(text) => {
            setDigits(text.replace(/\D/g, '').slice(0, 8));
            request.reset();
          }}
          onBlur={() => setTouched(true)}
          onSubmitEditing={() => valid && request.mutate()}
          placeholder="5000 0000"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="done"
          autoFocus
          hint={t('auth.phoneHint')}
          error={fieldError}
        />

        <Card tone="muted" padded={false}>
          <View style={styles.demoHeader}>
            <KeyRound size={16} color={colors.accent} strokeWidth={1.75} />
            <Text variant="captionStrong" tone="accent">
              {t('auth.demoTitle')}
            </Text>
          </View>
          <Text variant="caption" tone="secondary" style={styles.demoBody}>
            {t('auth.demoBody')}
          </Text>
          <ListRow
            icon={UserRound}
            title={t('auth.demoCustomer')}
            subtitle="+965 5555 0101"
            onPress={() => applyDemo('customer')}
          />
          <ListRow
            icon={Briefcase}
            title={t('auth.demoProfessional')}
            subtitle="+965 6000 1001"
            onPress={() => applyDemo('technician')}
          />
        </Card>

        <Text variant="caption" tone="muted" align="center">
          {t('auth.terms')} · {brand.legalName}
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  demoBody: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xs },
});
