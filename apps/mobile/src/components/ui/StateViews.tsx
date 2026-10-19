import { CloudOff, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[styles.iconRing, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Icon size={26} color={colors.accent} strokeWidth={1.5} />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="secondary" align="center" style={styles.body}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="md"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <EmptyState
      icon={CloudOff}
      title={t('common.somethingWrong')}
      body={t('common.somethingWrongBody')}
      actionLabel={t('common.retry')}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: space.huge,
    paddingHorizontal: space.xxl,
    gap: space.sm,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  body: { maxWidth: 300 },
  action: { marginTop: space.md },
});
