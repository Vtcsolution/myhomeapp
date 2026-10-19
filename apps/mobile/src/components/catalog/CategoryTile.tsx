import type { ServiceCategory } from '@myhome/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Photo } from '@/components/ui/Photo';
import { PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { categoryIcons } from './categoryIcons';

/** Grid tile for the all-categories screen: photo, icon seal, name and count. */
export function CategoryTile({
  category,
  caption,
  onPress,
}: {
  category: ServiceCategory;
  caption?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const f = useFormat();
  const Icon = categoryIcons[category.icon];
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={f.text(category.name)}
      style={styles.tile}
    >
      <Photo media={category.image} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(8,14,21,0.05)', 'rgba(8,14,21,0.2)', 'rgba(8,14,21,0.85)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.seal, { borderColor: 'rgba(217,188,138,0.6)' }]}>
        <Icon size={16} color={colors.champagne} strokeWidth={1.75} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong" style={{ color: colors.onMidnight }} numberOfLines={2}>
          {f.text(category.name)}
        </Text>
        {caption ? (
          <Text variant="caption" style={{ color: 'rgba(251,248,243,0.75)' }}>
            {caption}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 0.92,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: space.md,
  },
  seal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(15,29,43,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { gap: 2 },
});
