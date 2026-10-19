import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import {
  Platform,
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Subtle selection haptic on press (native only). */
  haptic?: boolean;
  /** Pressed scale; 1 disables the effect. */
  scaleTo?: number;
}

export function hapticSelection() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
}

/** Pressable with a restrained scale-down and optional haptic feedback. */
export function PressableScale({
  children,
  style,
  haptic = false,
  scaleTo = motion.pressScale,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        scale.set(withTiming(scaleTo, { duration: motion.fast }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, { duration: motion.base }));
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) hapticSelection();
        onPress?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
