import { type Href, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { gutter, space } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Show a back button; navigates back, or to `fallbackHref` when there is no history. */
  back?: boolean;
  fallbackHref?: Href;
  trailing?: ReactNode;
}

/** Large editorial title with an optional back button and trailing action. */
export function ScreenHeader({ title, subtitle, back, fallbackHref, trailing }: ScreenHeaderProps) {
  const { t } = useLocale();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (fallbackHref) router.replace(fallbackHref);
  };
  return (
    <View style={styles.wrapper}>
      {back || trailing ? (
        <View style={styles.bar}>
          {back ? (
            <IconButton icon={ArrowLeft} directional label={t('common.back')} onPress={goBack} />
          ) : (
            <View />
          )}
          {trailing ?? <View />}
        </View>
      ) : null}
      {title ? (
        <View style={styles.titles}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.section}>
      <Text variant="title2" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} accessibilityLabel={actionLabel} hitSlop={8}>
          <Text variant="calloutStrong" tone="accent">
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: gutter,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    gap: space.lg,
  },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titles: { gap: space.xs },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  sectionTitle: { flex: 1 },
});
