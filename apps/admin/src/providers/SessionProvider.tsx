import { isApiError, type Session } from '@myhome/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '@/services/api';
import { readPreferences, writePreferences } from '@/services/preferences';

type Status = 'restoring' | 'ready';

interface SessionContextValue {
  status: Status;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** The API rejected the session (expired or replaced): return to sign-in. */
  expire: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const isUsable = (s: Session | null): s is Session =>
  !!s && s.role === 'admin' && Date.parse(s.expiresAt) > Date.now();

/**
 * Demo admin session. The simulated API keeps one active session; the
 * dashboard stores its own in admin preferences and re-attaches it on load,
 * as a real client would send its token.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readPreferences().session;
    return isUsable(stored) ? stored : null;
  });
  const [status, setStatus] = useState<Status>(session ? 'restoring' : 'ready');

  useEffect(() => {
    if (!session || status !== 'restoring') return;
    void api.auth
      .restoreSession(session)
      .catch(() => {
        writePreferences({ session: null });
        setSession(null);
      })
      .finally(() => setStatus('ready'));
  }, [session, status]);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await api.auth.adminSignIn(email, password);
    writePreferences({ session: next });
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.auth.signOut();
    } catch (error) {
      if (!isApiError(error)) throw error;
    }
    writePreferences({ session: null });
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const expire = useCallback(() => {
    writePreferences({ session: null });
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, session, signIn, signOut, expire }),
    [status, session, signIn, signOut, expire],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
