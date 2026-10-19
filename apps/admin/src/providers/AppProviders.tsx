import { isApiError } from '@myhome/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { onExternalChange } from '@/services/api';
import { LocaleProvider } from './LocaleProvider';
import { SessionProvider } from './SessionProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        // Business errors (validation, not found, unauthorised) are not transient.
        retry: (failureCount, error) =>
          !isApiError(error) || (error.code === 'NETWORK' && failureCount < 2),
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // A customer or professional tab changed the shared demo: refresh everything.
  useEffect(() => onExternalChange(() => void queryClient.invalidateQueries()), [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <SessionProvider>
            <ToastProvider>{children}</ToastProvider>
          </SessionProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
