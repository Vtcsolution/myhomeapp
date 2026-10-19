import type { Locale } from '@myhome/shared';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '@/theme/tokens';
import { typeStyle } from '@/theme/typography';

const TAB_BAR_HEIGHT = 68;

/** Shared, understated tab bar styling for both roles. */
export function tabBarOptions(colors: ThemeColors, insets: EdgeInsets, locale: Locale) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    // Room for a 28pt icon slot and a 16pt label above the home indicator.
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.hairline,
      borderTopWidth: 1,
      height: TAB_BAR_HEIGHT + insets.bottom,
      paddingTop: 8,
      paddingBottom: insets.bottom + 8,
    },
    tabBarLabelStyle: { ...typeStyle('caption', locale), fontSize: 11, lineHeight: 14 },
    sceneStyle: { backgroundColor: colors.background },
  } as const;
}

export const tabIconProps = (focused: boolean) => ({ size: 22, strokeWidth: focused ? 2 : 1.6 });
