import {
  bookableDates,
  formatDayLabel,
  type JobView,
  kuwaitDateOf,
  kuwaitLocalToISO,
  monthName,
  type TechnicianProfileView,
  toKuwaitParts,
} from '@myhome/shared';
import { router } from 'expo-router';
import { CalendarOff, CalendarRange, Clock } from '@/components/ui/icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { JobCard } from '@/components/pro/JobCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { EmptyState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useNow } from '@/hooks/useNow';
import type { TKey } from '@/i18n/translate';
import { dayAgenda, jobsPerDay, type WindowState } from '@/lib/proSchedule';
import { proRoutes } from '@/navigation/routes';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, radius, space } from '@/theme/tokens';

const WINDOW_LABEL: Record<WindowState, TKey> = {
  booked: 'schedule.booked',
  free: 'schedule.free',
  outside: 'schedule.outside',
  past: 'schedule.outside',
};

/** Two-week date strip, the day's working hours, its jobs and every arrival window. */
export function ScheduleView({
  jobs,
  profile,
}: {
  jobs: JobView[];
  profile: TechnicianProfileView;
}) {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const now = useNow();
  const today = kuwaitDateOf(now);
  const dates = bookableDates(new Date(now).toISOString());
  const [selected, setSelected] = useState(today);
  const counts = jobsPerDay(jobs);
  const agenda = dayAgenda(selected, profile, jobs, now);

  const windowColors = (state: WindowState) =>
    state === 'booked'
      ? { bg: colors.accentSoft, border: colors.accent, fg: colors.textPrimary }
      : state === 'free'
        ? { bg: colors.surface, border: colors.border, fg: colors.textPrimary }
        : { bg: colors.surfaceMuted, border: colors.surfaceMuted, fg: colors.textMuted };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stripBleed}
        contentContainerStyle={styles.strip}
      >
        {dates.map((date) => {
          const isSelected = date === selected;
          const noon = kuwaitLocalToISO(date, '12:00');
          const count = counts.get(date) ?? 0;
          return (
            <PressableScale
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${f.date(noon, 'full')}${count ? `, ${t('schedule.jobs', { count })}` : ''}`}
              onPress={() => {
                hapticSelection();
                setSelected(date);
              }}
              style={[
                styles.date,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                variant="captionStrong"
                align="center"
                numberOfLines={1}
                style={{ color: isSelected ? colors.onPrimary : colors.textMuted }}
              >
                {formatDayLabel(date, today, locale)}
              </Text>
              <Text
                variant="title2"
                align="center"
                style={{ color: isSelected ? colors.onPrimary : colors.textPrimary }}
              >
                {toKuwaitParts(noon).day}
              </Text>
              <Text
                variant="caption"
                align="center"
                numberOfLines={1}
                style={{ color: isSelected ? colors.onPrimary : colors.textMuted }}
              >
                {monthName(toKuwaitParts(noon).month, locale, true)}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: count
                      ? isSelected
                        ? colors.onPrimary
                        : colors.accent
                      : 'transparent',
                  },
                ]}
              />
            </PressableScale>
          );
        })}
      </ScrollView>

      <Card tone="muted">
        <View style={styles.hoursRow}>
          {agenda.hours ? (
            <Clock size={18} color={colors.accent} strokeWidth={1.75} />
          ) : (
            <CalendarOff size={18} color={colors.textMuted} strokeWidth={1.75} />
          )}
          <View style={styles.hoursText}>
            <Text variant="bodyStrong">
              {agenda.dayOff
                ? t('schedule.dayOff')
                : agenda.hours
                  ? t('schedule.workingHours', {
                      start: f.time(kuwaitLocalToISO(selected, agenda.hours.start)),
                      end: f.time(kuwaitLocalToISO(selected, agenda.hours.end)),
                    })
                  : t('schedule.notWorking')}
            </Text>
            <Text variant="caption" tone="secondary">
              {t('schedule.jobs', { count: agenda.jobs.length })}
            </Text>
          </View>
          <Button
            label={t('schedule.editAvailability')}
            icon={CalendarRange}
            size="sm"
            variant="ghost"
            onPress={() => router.push(proRoutes.availability)}
          />
        </View>
      </Card>

      <View style={styles.section}>
        <Text variant="overline" tone="muted" accessibilityRole="header">
          {t('schedule.agenda')}
        </Text>
        {agenda.jobs.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={t('schedule.emptyDay')}
            body={agenda.hours ? t('schedule.emptyDayBody') : undefined}
          />
        ) : (
          agenda.jobs.map((job) => (
            <JobCard key={job.id} job={job} onPress={() => router.push(proRoutes.job(job.id))} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text variant="overline" tone="muted" accessibilityRole="header">
          {t('schedule.windows')}
        </Text>
        <View style={styles.grid}>
          {agenda.windows.map((w) => {
            const c = windowColors(w.state);
            const label = `${f.timeRange(w.start, w.end)} · ${t(WINDOW_LABEL[w.state])}`;
            return (
              <PressableScale
                key={w.start}
                disabled={!w.jobId}
                accessibilityRole={w.jobId ? 'button' : 'text'}
                accessibilityLabel={label}
                onPress={() => w.jobId && router.push(proRoutes.job(w.jobId))}
                style={[styles.window, { backgroundColor: c.bg, borderColor: c.border }]}
              >
                <Text
                  variant="calloutStrong"
                  align="center"
                  numberOfLines={1}
                  style={[styles.windowTime, { color: c.fg }]}
                >
                  {f.timeRange(w.start, w.end)}
                </Text>
                <Text
                  variant="caption"
                  align="center"
                  style={{ color: w.state === 'booked' ? colors.accent : colors.textMuted }}
                >
                  {t(WINDOW_LABEL[w.state])}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.lg },
  flex: { flex: 1, gap: 2 },
  stripBleed: { marginHorizontal: -gutter, flexGrow: 0 },
  strip: { paddingHorizontal: gutter, gap: space.sm },
  date: {
    width: 64,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.25,
    alignItems: 'center',
    gap: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  // Keeps the hours readable; the button wraps below it on small phones instead.
  hoursText: { flexGrow: 1, flexShrink: 1, flexBasis: 170 },
  section: { gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  window: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  windowTime: { fontSize: 13 },
});
