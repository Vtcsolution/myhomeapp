import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { dirAttribute, directionStyle } from '@/theme/direction';
import { elevation, gutter, radius, space } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centred confirmation dialog (works identically on native and web). */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const { t, direction } = useLocale();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View {...dirAttribute(direction)} style={[styles.backdrop, directionStyle(direction)]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onCancel}
          accessibilityLabel={t('common.cancel')}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, boxShadow: elevation.floating },
          ]}
        >
          <Text variant="title1">{title}</Text>
          {body ? (
            <Text variant="body" tone="secondary">
              {body}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              size="md"
              onPress={onCancel}
              style={styles.action}
            />
            <Button
              label={confirmLabel}
              variant="primary"
              size="md"
              loading={loading}
              onPress={onConfirm}
              style={[styles.action, destructive && { backgroundColor: colors.danger }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: gutter },
  dialog: {
    borderRadius: radius.xxl,
    padding: space.xxl,
    gap: space.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  action: { flex: 1 },
});
