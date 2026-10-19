import {
  businessConfig,
  formatDayLabel,
  kuwaitDateOf,
  kuwaitLocalToISO,
  monthName,
  type TimeSlot,
  toKuwaitParts,
  weekdayOfLocalDate,
} from '@myhome/shared';
import { CalendarX2, Info } from '@/components/ui/icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import type { TKey } from '@/i18n/translate';
import { groupSlots, slotState } from '@/lib/slots';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';

export interface DateAvailability {
  slots: TimeSlot[] | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

const PERIOD_LABEL: Record<'morning' | 'afternoon' | 'evening', TKey> = {
  morning: 'bookFlow.morning',
  afternoon: 'bookFlow.afternoon',
  evening: 'bookFlow.evening',
};

/**
 * Date strip + arrival windows. Availability always comes from the API
 * (shared scheduling rules); this component only presents it.
 */
export function SlotPicker({
  dates,
  availability,
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  currentSlot,
}: {
  dates: string[];
  availability: ReadonlyMap<string, DateAvailability>;
  selectedDate: string | undefined;
  onSelectDate: (date: string) => void;
  selectedSlot: string | undefined;
  onSelectSlot: (slot: TimeSlot) => void;
  /** When rescheduling: the booking's present window, shown but never selectable. */
  currentSlot?: string;
}) {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const today = kuwaitDateOf(useNow());
  const current = selectedDate ? availability.get(selectedDate) : undefined;
  const hasOpen = (slots: TimeSlot[] | undefined) =>
    !!slots?.some((slot) => slotState(slot, undefined, currentSlot) === 'available');
  const isFriday = selectedDate ? weekdayOfLocalDate(selectedDate) === 5 : false;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stripBleed}
        contentContainerStyle={styles.strip}
      >
        {dates.map((date) => {
          const info = availability.get(date);
          const full = info && !info.isPending && !info.isError && !hasOpen(info.slots);
          const selected = date === selectedDate;
          const noon = kuwaitLocalToISO(date, '12:00');
          return (
            <PressableScale
              key={date}
              disabled={full}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!full }}
              accessibilityLabel={f.date(noon, 'full')}
              onPress={() => {
                hapticSelection();
                onSelectDate(date);
              }}
              style={[
                styles.date,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: full ? 0.4 : 1,
                },
              ]}
            >
              <Text
                variant="captionStrong"
                align="center"
                style={{ color: selected ? colors.onPrimary : colors.textMuted }}
                numberOfLines={1}
              >
                {formatDayLabel(date, today, locale)}
              </Text>
              <Text
                variant="title2"
                align="center"
                style={{ color: selected ? colors.onPrimary : colors.textPrimary }}
              >
                {toKuwaitParts(noon).day}
              </Text>
              <Text
                variant="caption"
                align="center"
                style={{ color: selected ? colors.onPrimary : colors.textMuted }}
                numberOfLines={1}
              >
                {monthName(toKuwaitParts(noon).month, locale, true)}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {isFriday ? (
        <View style={[styles.note, { backgroundColor: colors.infoSoft }]}>
          <Info size={16} color={colors.info} strokeWidth={1.75} />
          <Text variant="caption" style={[styles.flex, { color: colors.info }]}>
            {t('bookFlow.fridayNote', {
              time: f.time(kuwaitLocalToISO(selectedDate!, businessConfig.workingHours[5].open)),
            })}
          </Text>
        </View>
      ) : null}

      {!current || current.isPending ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} rounded={radius.lg} style={styles.slotSkeleton} />
          ))}
        </View>
      ) : current.isError ? (
        <ErrorState onRetry={current.refetch} />
      ) : !hasOpen(current.slots) ? (
        <EmptyState
          icon={CalendarX2}
          title={t('bookFlow.noSlotsTitle')}
          body={t('bookFlow.noSlotsBody')}
        />
      ) : (
        groupSlots(current.slots ?? []).map((group) => (
          <View key={group.period} style={styles.group}>
            <Text variant="overline" tone="muted">
              {t(PERIOD_LABEL[group.period])}
            </Text>
            <View style={styles.grid}>
              {group.slots.map((slot) => {
                const state = slotState(slot, selectedSlot, currentSlot);
                const selected = state === 'selected';
                const isCurrent = state === 'current';
                const enabled = selected || state === 'available';
                const range = f.timeRange(slot.start, slot.end);
                return (
                  <PressableScale
                    key={slot.start}
                    disabled={!enabled}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: !enabled }}
                    accessibilityLabel={
                      isCurrent ? `${range}, ${t('bookFlow.currentSlot')}` : range
                    }
                    onPress={() => {
                      hapticSelection();
                      onSelectSlot(slot);
                    }}
                    style={[
                      styles.slot,
                      isCurrent && styles.slotCurrent,
                      {
                        backgroundColor: selected
                          ? colors.accentSoft
                          : isCurrent
                            ? colors.surfaceMuted
                            : colors.surface,
                        borderColor: selected || isCurrent ? colors.accent : colors.border,
                        opacity: state === 'unavailable' ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text
                      variant="calloutStrong"
                      align="center"
                      numberOfLines={1}
                      style={styles.slotText}
                    >
                      {range}
                    </Text>
                    {isCurrent ? (
                      <Text variant="captionStrong" tone="accent" align="center">
                        {t('bookFlow.currentSlot')}
                      </Text>
                    ) : state === 'unavailable' ? (
                      <Text variant="caption" tone="muted" align="center">
                        {t('bookFlow.booked')}
                      </Text>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.lg },
  flex: { flex: 1 },
  stripBleed: { marginHorizontal: -gutter, flexGrow: 0 },
  strip: { paddingHorizontal: gutter, gap: space.sm },
  date: {
    width: 68,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.25,
    alignItems: 'center',
    gap: 2,
  },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  group: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  slot: {
    flexGrow: 1,
    flexBasis: '46%',
    // Two columns where a full "12:00 PM – 2:00 PM" fits; one column on the narrowest phones.
    minWidth: 140,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  slotText: { fontSize: 13 },
  slotCurrent: { borderStyle: 'dashed' },
  slotSkeleton: { flexGrow: 1, flexBasis: '46%', minWidth: 140 },
});
