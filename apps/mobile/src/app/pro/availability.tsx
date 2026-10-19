import {
  addDaysToLocalDate,
  isApiError,
  kuwaitDateOf,
  kuwaitLocalToISO,
  minutesToHHmm,
  type TechnicianAvailability,
  weekdayName,
} from '@myhome/shared';
import { router } from 'expo-router';
import { CalendarPlus, Minus, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useAvailability, useUpdateAvailability } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import {
  addDayOff,
  businessBounds,
  invalidDays,
  removeDayOff,
  stepTime,
  toggleDay,
  WEEKDAYS,
} from '@/lib/availabilityForm';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Weekly working hours and days off; customers are only offered times inside them. */
export default function AvailabilityScreen() {
  const { t } = useLocale();
  const availability = useAvailability();
  const header = (
    <ScreenHeader
      back
      fallbackHref="/pro/profile"
      title={t('availability.title')}
      subtitle={t('availability.subtitle')}
    />
  );
  if (availability.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={5} height={72} />
      </Screen>
    );
  }
  if (availability.isError) {
    return (
      <Screen header={header}>
        <ErrorState onRetry={() => void availability.refetch()} />
      </Screen>
    );
  }
  return <AvailabilityForm initial={availability.data} header={header} />;
}

function AvailabilityForm({
  initial,
  header,
}: {
  initial: TechnicianAvailability;
  header: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const save = useUpdateAvailability();
  const now = useNow();
  const today = kuwaitDateOf(now);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pickingDay, setPickingDay] = useState(false);
  const invalid = invalidDays(form);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  // Formats a Kuwait wall-clock time (any date works; today keeps it simple).
  const clock = (hhmm: string) => f.time(kuwaitLocalToISO(today, hhmm));
  const upcoming = Array.from({ length: 30 }, (_, i) => addDaysToLocalDate(today, i + 1));

  const submit = () => {
    setError(null);
    if (invalid.length) {
      setError(t('availability.invalid'));
      return;
    }
    save.mutate(form, {
      onSuccess: () => {
        show(t('availability.saved'), 'success');
        if (router.canGoBack()) router.back();
      },
      onError: (e) =>
        setError(
          isApiError(e) && e.code === 'CONFLICT'
            ? t('availability.conflict', {
                references: Array.isArray(e.details) ? e.details.join(', ') : '',
              })
            : isApiError(e) && e.code === 'VALIDATION'
              ? t('availability.invalid')
              : t('errors.generic'),
        ),
    });
  };

  return (
    <Screen
      header={header}
      footer={
        <View style={styles.footer}>
          {error ? (
            <Text variant="callout" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button
            label={t('availability.save')}
            fullWidth
            disabled={!dirty}
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      }
    >
      <Text variant="title3" accessibilityRole="header">
        {t('availability.weekly')}
      </Text>
      <Card padded={false}>
        {WEEKDAYS.map((day, index) => {
          const hours = form.weekly[day];
          const { open, close } = businessBounds(day);
          const dayName = weekdayName(day, locale);
          return (
            <View
              key={day}
              style={[
                styles.day,
                index > 0 && {
                  borderTopColor: colors.hairline,
                  borderTopWidth: StyleSheet.hairlineWidth * 2,
                },
              ]}
            >
              <View style={styles.dayHead}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{dayName}</Text>
                  <Text variant="caption" tone="muted">
                    {t('availability.businessHours', {
                      open: clock(minutesToHHmm(open)),
                      close: clock(minutesToHHmm(close)),
                    })}
                  </Text>
                </View>
                <Text variant="caption" tone={hours ? 'accent' : 'muted'}>
                  {hours ? t('availability.working') : t('availability.off')}
                </Text>
                <Switch
                  value={!!hours}
                  accessibilityLabel={`${dayName}: ${hours ? t('availability.working') : t('availability.off')}`}
                  onValueChange={(on) => {
                    hapticSelection();
                    setForm((current) => toggleDay(current, day, on));
                  }}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surface}
                  {...({ activeThumbColor: colors.surface } as object)}
                />
              </View>
              {hours ? (
                <View style={styles.times}>
                  <TimeStepper
                    label={t('availability.from')}
                    value={clock(hours.start)}
                    onStep={(steps) => setForm((c) => stepTime(c, day, 'start', steps))}
                  />
                  <TimeStepper
                    label={t('availability.to')}
                    value={clock(hours.end)}
                    onStep={(steps) => setForm((c) => stepTime(c, day, 'end', steps))}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <View style={styles.section}>
        <Text variant="title3" accessibilityRole="header">
          {t('availability.daysOff')}
        </Text>
        {form.daysOff.length === 0 ? (
          <Text variant="callout" tone="muted">
            {t('availability.noDaysOff')}
          </Text>
        ) : (
          <View style={styles.chips}>
            {form.daysOff.map((date) => (
              <PressableScale
                key={date}
                accessibilityRole="button"
                accessibilityLabel={t('availability.remove', {
                  date: f.date(kuwaitLocalToISO(date, '12:00'), 'medium'),
                })}
                onPress={() => setForm((c) => removeDayOff(c, date))}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text variant="calloutStrong">
                  {f.date(kuwaitLocalToISO(date, '12:00'), 'dayMonth')}
                </Text>
                <X size={14} color={colors.textMuted} strokeWidth={2} />
              </PressableScale>
            ))}
          </View>
        )}
        <Button
          label={t('availability.addDayOff')}
          icon={CalendarPlus}
          variant="secondary"
          size="sm"
          style={styles.addDay}
          onPress={() => setPickingDay(true)}
        />
      </View>

      <Sheet
        visible={pickingDay}
        title={t('availability.chooseDay')}
        onClose={() => setPickingDay(false)}
      >
        <ScrollView style={styles.dayList}>
          {upcoming.map((date) => {
            const taken = form.daysOff.includes(date);
            return (
              <PressableScale
                key={date}
                disabled={taken}
                accessibilityRole="button"
                accessibilityState={{ disabled: taken }}
                onPress={() => {
                  setForm((c) => addDayOff(c, date));
                  setPickingDay(false);
                }}
                style={[
                  styles.dayOption,
                  { borderBottomColor: colors.hairline, opacity: taken ? 0.4 : 1 },
                ]}
              >
                <Text variant="body">{f.date(kuwaitLocalToISO(date, '12:00'), 'full')}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

function TimeStepper({
  label,
  value,
  onStep,
}: {
  label: string;
  value: string;
  onStep: (steps: number) => void;
}) {
  const { colors } = useTheme();
  const button = (steps: number, Icon: typeof Plus, a11y: string) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      onPress={() => {
        hapticSelection();
        onStep(steps);
      }}
      style={[styles.stepButton, { borderColor: colors.border }]}
    >
      <Icon size={16} color={colors.textPrimary} strokeWidth={2} />
    </PressableScale>
  );
  return (
    <View style={styles.stepper}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View style={styles.stepRow}>
        {button(-1, Minus, `${label} −30`)}
        <Text variant="bodyStrong" style={styles.stepValue} accessibilityLiveRegion="polite">
          {value}
        </Text>
        {button(1, Plus, `${label} +30`)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  footer: { gap: space.sm },
  day: { padding: space.lg, gap: space.md },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  times: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  stepper: { flexGrow: 1, flexBasis: 120, gap: space.xs },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { flex: 1, textAlign: 'center' },
  section: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1.25,
  },
  addDay: { alignSelf: 'flex-start' },
  dayList: { maxHeight: 360 },
  dayOption: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
});
