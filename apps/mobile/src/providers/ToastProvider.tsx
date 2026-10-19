import { CircleCheck, Info } from '@/components/ui/icons';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { elevation, gutter, motion, radius, space } from '@/theme/tokens';

type ToastTone = 'info' | 'success';

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const VISIBLE_MS = 2600;

/** Quiet, single-line confirmations shown above the tab bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone; id: number } | null>(null);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    progress.set(withTiming(1, { duration: motion.base }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      progress.set(withTiming(0, { duration: motion.base }));
    }, VISIBLE_MS);
    return () => clearTimeout(timer.current);
  }, [toast, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 16 }],
  }));

  const value = useMemo(() => ({ show }), [show]);
  const Icon = toast?.tone === 'success' ? CircleCheck : Info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.host, { bottom: insets.bottom + 84 }, animatedStyle]}
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: colors.midnight, boxShadow: elevation.floating },
            ]}
          >
            <Icon size={18} color={colors.champagne} strokeWidth={1.75} />
            <Text variant="callout" style={{ color: colors.onMidnight, flex: 1 }}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    start: gutter,
    end: gutter,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    maxWidth: 520,
    width: '100%',
  },
});
