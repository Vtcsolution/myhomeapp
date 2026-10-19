import {
  type AddressField,
  type AddressIssue,
  type AddressLabel,
  type GovernorateId,
  isApiError,
  type PropertyType,
} from '@myhome/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Info } from '@/components/ui/icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { AreaPicker } from '@/components/address/AreaPicker';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/Headers';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useCustomerProfile, useGovernorates, useSaveAddress } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import type { TKey } from '@/i18n/translate';
import {
  type AddressFormState,
  emptyAddressForm,
  type FieldErrors,
  fieldErrors,
  formFromAddress,
  inputFromForm,
  issuesFromError,
  validateForm,
} from '@/lib/addressForm';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const PROPERTY_TYPES: [PropertyType, TKey][] = [
  ['apartment', 'addressForm.apartment'],
  ['house', 'addressForm.house'],
  ['villa', 'addressForm.villa'],
  ['office', 'addressForm.office'],
];

/**
 * Add or edit an address. `from=booking` returns to the booking flow with the
 * saved address selected.
 */
export default function AddressFormScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const profile = useCustomerProfile();
  const { t } = useLocale();

  if (profile.isPending) {
    return (
      <Screen header={<ScreenHeader back fallbackHref="/customer/addresses" />}>
        <SkeletonList count={4} height={64} />
      </Screen>
    );
  }
  const existing = id ? profile.data?.addresses.find((a) => a.id === id) : undefined;
  const initial = existing
    ? formFromAddress(existing)
    : emptyAddressForm((profile.data?.addresses.length ?? 0) === 0);
  return (
    <AddressForm
      key={existing?.id ?? 'new'}
      initial={initial}
      title={existing ? t('addressForm.titleEdit') : t('addressForm.titleNew')}
      returnToBooking={from === 'booking'}
    />
  );
}

function AddressForm({
  initial,
  title,
  returnToBooking,
}: {
  initial: AddressFormState;
  title: string;
  returnToBooking: boolean;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const governorates = useGovernorates();
  const save = useSaveAddress();
  const [form, setForm] = useState<AddressFormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [serverIssues, setServerIssues] = useState<AddressIssue[]>([]);

  const set = <K extends keyof AddressFormState>(key: K, value: AddressFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setServerIssues([]);
  };
  const errors: FieldErrors = submitted
    ? { ...validateForm(form), ...fieldErrors(serverIssues) }
    : {};
  const message = (field: AddressField): string | undefined => {
    const code = errors[field];
    if (!code) return undefined;
    if (field === 'areaId') return t('addressForm.errorArea');
    if (field === 'contactPhone') return t('addressForm.errorPhone');
    if (field === 'paciNumber') return t('addressForm.errorPaci');
    return code === 'too_long' ? t('addressForm.errorTooLong') : t('addressForm.errorRequired');
  };
  const showUnitFields = form.propertyType === 'apartment' || form.propertyType === 'office';

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validateForm(form)).length) return;
    save.mutate(inputFromForm(form), {
      onSuccess: (address) => {
        show(t('addresses.saved'), 'success');
        router.back();
        // Hand the new address back to the booking step that opened this form.
        if (returnToBooking) router.setParams({ addressId: address.id });
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'VALIDATION')
          setServerIssues(issuesFromError(error.details));
        else show(t('addressForm.errorSave'));
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={<ScreenHeader back fallbackHref="/customer/addresses" title={title} />}
        footer={
          <Button
            label={t('addressForm.save')}
            fullWidth
            loading={save.isPending}
            onPress={submit}
          />
        }
        contentStyle={styles.content}
      >
        <View style={styles.group}>
          <Text variant="captionStrong" tone="secondary">
            {t('addressForm.label')}
          </Text>
          <SegmentedControl<AddressLabel>
            accessibilityLabel={t('addressForm.label')}
            value={form.label}
            onChange={(v) => set('label', v)}
            segments={[
              { value: 'home', label: t('addressForm.home') },
              { value: 'work', label: t('addressForm.work') },
              { value: 'other', label: t('addressForm.other') },
            ]}
          />
          {form.label === 'other' ? (
            <TextField
              label={t('addressForm.customLabel')}
              placeholder={t('addressForm.customLabelPlaceholder')}
              value={form.customLabel}
              onChangeText={(v) => set('customLabel', v)}
              maxLength={30}
              error={message('customLabel')}
            />
          ) : null}
        </View>

        <View style={styles.group}>
          <Text variant="captionStrong" tone="secondary">
            {t('addressForm.propertyType')}
          </Text>
          <ChipRow>
            {PROPERTY_TYPES.map(([value, label]) => (
              <Chip
                key={value}
                label={t(label)}
                selected={form.propertyType === value}
                onPress={() => set('propertyType', value)}
              />
            ))}
          </ChipRow>
        </View>

        <View style={styles.group}>
          <Text variant="captionStrong" tone="secondary">
            {t('addressForm.governorate')}
          </Text>
          <ChipRow>
            {(governorates.data ?? []).map((g) => (
              <Chip
                key={g.id}
                label={f.text(g.name)}
                selected={form.governorateId === g.id}
                onPress={() => {
                  setForm((current) =>
                    current.governorateId === g.id
                      ? current
                      : { ...current, governorateId: g.id as GovernorateId, areaId: '' },
                  );
                }}
              />
            ))}
          </ChipRow>
          <AreaPicker
            governorateId={form.governorateId}
            areaId={form.areaId}
            onChange={(area) =>
              setForm((current) => ({
                ...current,
                areaId: area.id,
                governorateId: area.governorateId,
              }))
            }
            error={message('areaId')}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label={t('addressForm.block')}
              value={form.block}
              onChangeText={(v) => set('block', v)}
              maxLength={10}
              error={message('block')}
            />
          </View>
          <View style={styles.flex2}>
            <TextField
              label={t('addressForm.street')}
              value={form.street}
              onChangeText={(v) => set('street', v)}
              maxLength={60}
              error={message('street')}
            />
          </View>
        </View>
        <TextField
          label={t('addressForm.avenue')}
          value={form.avenue}
          onChangeText={(v) => set('avenue', v)}
          maxLength={40}
        />
        <TextField
          label={t('addressForm.building')}
          value={form.building}
          onChangeText={(v) => set('building', v)}
          maxLength={20}
          error={message('building')}
        />
        {showUnitFields ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label={t('addressForm.floor')}
                value={form.floor}
                onChangeText={(v) => set('floor', v)}
                maxLength={10}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label={t('addressForm.apartmentNo')}
                value={form.apartment}
                onChangeText={(v) => set('apartment', v)}
                maxLength={10}
                error={message('apartment')}
              />
            </View>
          </View>
        ) : null}
        <TextField
          label={t('addressForm.paci')}
          hint={t('addressForm.paciHint')}
          value={form.paciNumber}
          onChangeText={(v) => set('paciNumber', v)}
          keyboardType="number-pad"
          ltr
          maxLength={12}
          error={message('paciNumber')}
        />
        <TextField
          label={t('addressForm.contactPhone')}
          hint={t('addressForm.contactPhoneHint')}
          prefix="+965"
          ltr
          value={form.contactPhone.replace(/^\+965/, '')}
          onChangeText={(v) => set('contactPhone', v.replace(/[^\d\s]/g, '').slice(0, 9))}
          keyboardType="phone-pad"
          error={message('contactPhone')}
        />
        <TextField
          label={t('addressForm.directions')}
          placeholder={t('addressForm.directionsPlaceholder')}
          value={form.directions}
          onChangeText={(v) => set('directions', v)}
          maxLength={200}
          multiline
        />

        <PressableScale
          scaleTo={0.99}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.isDefault }}
          accessibilityLabel={t('addressForm.makeDefault')}
          onPress={() => {
            hapticSelection();
            set('isDefault', !form.isDefault);
          }}
          style={[styles.check, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View
            style={[
              styles.box,
              {
                borderColor: form.isDefault ? colors.accent : colors.border,
                backgroundColor: form.isDefault ? colors.accent : 'transparent',
              },
            ]}
          >
            {form.isDefault ? <Check size={14} color={colors.onAccent} strokeWidth={2.5} /> : null}
          </View>
          <Text variant="bodyStrong" style={styles.flex}>
            {t('addressForm.makeDefault')}
          </Text>
        </PressableScale>

        <View style={styles.note}>
          <Info size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t('addressForm.locationNote')}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  content: { gap: space.lg },
  group: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
