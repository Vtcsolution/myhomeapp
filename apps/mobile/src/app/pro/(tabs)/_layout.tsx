import { Tabs } from 'expo-router/js-tabs';
import { Briefcase, CalendarCheck, CircleUserRound, TrendingUp } from '@/components/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarOptions, tabIconProps } from '@/components/navigation/tabBarOptions';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProTabs() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabBarOptions(colors, insets, locale)}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, focused }) => (
            <CalendarCheck color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: t('tabs.jobs'),
          tabBarIcon: ({ color, focused }) => (
            <Briefcase color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('tabs.earnings'),
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <CircleUserRound color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
    </Tabs>
  );
}
