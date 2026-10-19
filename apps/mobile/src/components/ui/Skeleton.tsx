import { useEffect } from 'react';
import {
  type DimensionValue,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Gently pulsing placeholder block. */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.set(
      withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        { width, height, borderRadius: rounded, backgroundColor: colors.skeleton },
        animated,
        style,
      ]}
    />
  );
}

/** Placeholder for a list of cards while data loads. */
export function SkeletonList({ count = 3, height = 96 }: { count?: number; height?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} rounded={radius.xl} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
