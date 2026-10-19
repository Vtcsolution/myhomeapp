import { ChevronRight, type LucideIcon } from '@/components/ui/icons';
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Card } from './Card';
import { DirectionalIcon } from './DirectionalIcon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  /** Trailing value text or custom element. */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

export function ListRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onPress,
  destructive,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <View style={styles.row}>
      {Icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: destructive ? colors.dangerSoft : colors.accentSoft },
          ]}
        >
          <Icon size={18} color={destructive ? colors.danger : colors.accent} strokeWidth={1.75} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="bodyStrong" tone={destructive ? 'danger' : 'primary'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof trailing === 'string' ? (
        <Text variant="callout" tone="secondary" numberOfLines={1}>
          {trailing}
        </Text>
      ) : (
        trailing
      )}
      {onPress && !destructive ? (
        <DirectionalIcon
          icon={ChevronRight}
          size={18}
          color={colors.textMuted}
          strokeWidth={1.75}
        />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={title} scaleTo={0.99}>
      {content}
    </PressableScale>
  );
}

/** Groups rows on one card with inset dividers. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <Card padded={false}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
          ) : null}
          {child}
        </Fragment>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    minHeight: 60,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginStart: space.lg + 36 + space.md },
});
