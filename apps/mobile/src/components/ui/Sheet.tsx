import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { dirAttribute, directionStyle } from '@/theme/direction';
import { elevation, gutter, radius, space } from '@/theme/tokens';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned below the content (actions). */
  footer?: ReactNode;
  /** Fraction of the screen the sheet may occupy. */
  maxHeight?: `${number}%`;
}

/** Bottom sheet for pickers and confirmations; tapping the backdrop closes it. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
  maxHeight = '85%',
}: SheetProps) {
  const { colors } = useTheme();
  const { t, direction } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View {...dirAttribute(direction)} style={[styles.root, directionStyle(direction)]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityLabel={t('common.close')}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              boxShadow: elevation.floating,
              maxHeight,
              paddingBottom: insets.bottom + space.lg,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text variant="title2" style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopStartRadius: radius.xxl,
    borderTopEndRadius: radius.xxl,
    paddingTop: space.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.md },
  title: { paddingHorizontal: gutter, marginBottom: space.md },
  body: { flexShrink: 1, paddingHorizontal: gutter },
  footer: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.sm },
});
