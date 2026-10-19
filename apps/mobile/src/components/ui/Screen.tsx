import { type ComponentRef, type ReactNode, useRef } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { gutter, space } from '@/theme/tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Rendered above the scrolling content (not scrolled). */
  header?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Content that sticks to the bottom (e.g. a primary action). */
  footer?: ReactNode;
  /** Keep the newest content in view (conversations). */
  stickToEnd?: boolean;
}

export function Screen({
  children,
  header,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = ['top'],
  contentStyle,
  footer,
  stickToEnd = false,
}: ScreenProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      {header}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={
            stickToEnd ? () => scrollRef.current?.scrollToEnd({ animated: true }) : undefined
          }
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { borderTopColor: colors.hairline }]}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: space.huge, gap: space.xxl },
  footer: {
    paddingHorizontal: gutter,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
