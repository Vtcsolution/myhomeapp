import { Tabs } from 'expo-router/js-tabs';
import { CalendarDays, House, TicketPercent, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarOptions, tabIconProps } from '@/components/navigation/tabBarOptions';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function CustomerTabs() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabBarOptions(colors, insets, locale)}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <House color={color} {...tabIconProps(focused)} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t('tabs.offers'),
          tabBarIcon: ({ color, focused }) => (
            <TicketPercent color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color, focused }) => (
            <UserRound color={color} {...tabIconProps(focused)} />
          ),
        }}
      />
    </Tabs>
  );
}
