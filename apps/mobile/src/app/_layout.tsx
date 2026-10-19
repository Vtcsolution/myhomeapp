import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  LocaleProvider,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppProviders } from '@/providers/AppProviders';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { appFonts } from '@/theme/fonts';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  return (
    <AppProviders>
      <RootNavigator fontsReady={fontsLoaded || fontError !== null} />
    </AppProviders>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useSession();
  const { direction } = useLocale();
  const { colors, scheme } = useTheme();
  const ready = fontsReady && status === 'ready';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.hairline,
      },
    };
  }, [scheme, colors]);

  if (!ready) return null;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <LocaleProvider direction={direction}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="customer" options={{ animation: 'fade' }} />
          <Stack.Screen name="pro" options={{ animation: 'fade' }} />
        </Stack>
      </LocaleProvider>
    </NavigationThemeProvider>
  );
}
