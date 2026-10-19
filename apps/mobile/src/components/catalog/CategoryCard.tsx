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

export const CATEGORY_CARD_WIDTH = 132;

/** Tall photographic category card with an icon seal and label. */
export function CategoryCard({
  category,
  onPress,
}: {
  category: ServiceCategory;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const f = useFormat();
  const Icon = categoryIcons[category.icon];
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={f.text(category.name)}
      style={styles.card}
    >
      <Photo media={category.image} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(8,14,21,0)', 'rgba(8,14,21,0.15)', 'rgba(8,14,21,0.82)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.seal,
          { backgroundColor: 'rgba(15,29,43,0.55)', borderColor: 'rgba(217,188,138,0.6)' },
        ]}
      >
        <Icon size={16} color={colors.champagne} strokeWidth={1.75} />
      </View>
      <Text
        variant="calloutStrong"
        numberOfLines={2}
        style={[styles.label, { color: colors.onMidnight }]}
      >
        {f.text(category.name)}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CATEGORY_CARD_WIDTH,
    height: 172,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6 },
});
