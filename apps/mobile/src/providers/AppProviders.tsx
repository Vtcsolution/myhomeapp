import { isApiError } from '@myhome/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { dirAttribute, directionStyle } from '@/theme/direction';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider, useLocale } from './LocaleProvider';
import { SessionProvider } from './SessionProvider';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Business errors (validation, not found, unauthorised) are not transient.
        retry: (failureCount, error) =>
          !isApiError(error) || (error.code === 'NETWORK' && failureCount < 2),
      },
    },
  });
}

/**
 * Applies the reading direction to all app content (navigation receives it via
 * Expo Router's LocaleProvider in the root layout). On web, `dir` also sets the
 * HTML direction so text inputs and scrolling follow it.
 */
function DirectionRoot({ children }: { children: ReactNode }) {
  const { direction } = useLocale();
  const { colors } = useTheme();
  return (
    <View
      {...dirAttribute(direction)}
      style={[styles.root, directionStyle(direction), { backgroundColor: colors.background }]}
    >
      {children}
    </View>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <DirectionRoot>
              <SessionProvider>
                <ToastProvider>{children}</ToastProvider>
              </SessionProvider>
            </DirectionRoot>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
