import { type Address, addressTitle, formatKuwaitPhone } from '@myhome/shared';
import { Briefcase, House, MapPin, Pencil, Star, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const labelIcon = { home: House, work: Briefcase, other: MapPin } as const;

export interface AddressCardProps {
  address: Address;
  /** Selection mode (booking flow): shows a radio and highlights when selected. */
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

export function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const f = useFormat();
  const Icon = labelIcon[address.label];
  const selectable = !!onSelect;

  const body = (
    <View style={styles.row}>
      <View
        style={[styles.icon, { backgroundColor: selected ? colors.accent : colors.accentSoft }]}
      >
        <Icon size={18} color={selected ? colors.onAccent : colors.accent} strokeWidth={1.75} />
      </View>
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flexShrink}>
            {addressTitle(address, locale)}
          </Text>
          {address.isDefault ? <Badge label={t('addresses.default')} tone="accent" /> : null}
        </View>
        <Text variant="callout" tone="secondary">
          {f.address(address, 'full')}
        </Text>
        {address.contactPhone ? (
          <Text variant="caption" tone="muted">
            {t('addresses.contact', { phone: formatKuwaitPhone(address.contactPhone) })}
          </Text>
        ) : null}
      </View>
      {selectable ? (
        <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
        </View>
      ) : null}
    </View>
  );

  const actions =
    onEdit || onDelete || onSetDefault ? (
      <View style={[styles.actions, { borderTopColor: colors.hairline }]}>
        {onSetDefault && !address.isDefault ? (
          <Action icon={Star} label={t('addresses.setDefault')} onPress={onSetDefault} />
        ) : null}
        {onEdit ? <Action icon={Pencil} label={t('addresses.edit')} onPress={onEdit} /> : null}
        {onDelete ? (
          <Action icon={Trash2} label={t('addresses.delete')} onPress={onDelete} danger />
        ) : null}
      </View>
    ) : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : colors.hairline,
        },
      ]}
    >
      {selectable ? (
        <PressableScale
          scaleTo={0.99}
          accessibilityRole="radio"
          accessibilityState={{ checked: !!selected }}
          accessibilityLabel={`${addressTitle(address, locale)}, ${f.address(address, 'full')}`}
          onPress={() => {
            hapticSelection();
            onSelect?.();
          }}
        >
          {body}
        </PressableScale>
      ) : (
        body
      )}
      {actions}
    </View>
  );
}

function Action({
  icon: Icon,
  label,
  onPress,
  danger,
}: {
  icon: typeof Star;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.textSecondary;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={6} style={styles.action}>
      <Icon size={15} color={color} strokeWidth={1.75} />
      <Text variant="captionStrong" style={{ color }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1.25, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: space.md, padding: space.lg, alignItems: 'flex-start' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flexShrink: { flexShrink: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
