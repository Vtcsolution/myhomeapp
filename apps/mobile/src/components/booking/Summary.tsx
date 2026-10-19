import type { BookingSelections, Service } from '@myhome/shared';
import type { LucideIcon } from '@/components/ui/icons';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Photo } from '@/components/ui/Photo';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** "Cassette · 3 × per AC unit · Anti-bacterial coil treatment" */
export function useSelectionLine() {
  const f = useFormat();
  return (service: Service, selections: BookingSelections): string => {
    const parts: string[] = [];
    for (const group of service.optionGroups) {
      const choice = group.choices.find((c) => c.id === selections.options[group.id]);
      if (choice) parts.push(f.text(choice.label));
    }
    if (
      (service.pricingModel === 'per_unit' || service.pricingModel === 'hourly') &&
      service.unitLabel
    ) {
      parts.push(`${selections.units} × ${f.text(service.unitLabel)}`);
    }
    for (const addOn of service.addOns) {
      if (selections.addOnIds.includes(addOn.id)) parts.push(f.text(addOn.name));
    }
    return parts.join(' · ');
  };
}

/** Service photo, name and configured options. */
export function ServiceSummary({
  service,
  selections,
}: {
  service: Service;
  selections: BookingSelections;
}) {
  const f = useFormat();
  const line = useSelectionLine();
  return (
    <View style={styles.service}>
      <Photo media={service.image} style={styles.thumb} />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{f.text(service.name)}</Text>
        <Text variant="caption" tone="secondary">
          {line(service, selections)}
        </Text>
      </View>
    </View>
  );
}

/** Icon, label and value with an optional "Change" action. */
export function InfoRow({
  icon: Icon,
  label,
  value,
  detail,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  onChange?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <View style={styles.info}>
      <View style={[styles.infoIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon size={16} color={colors.accent} strokeWidth={1.75} />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
        {detail ? (
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
      {onChange ? (
        <PressableScale
          onPress={onChange}
          accessibilityLabel={`${t('bookFlow.change')} ${label}`}
          hitSlop={8}
        >
          <Text variant="calloutStrong" tone="accent">
            {t('bookFlow.change')}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Card grouping info rows with dividers. */
export function SummaryCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <Card>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.hairline }]} /> : null}
          {child}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  service: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  info: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: space.md },
});
