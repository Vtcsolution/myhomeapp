import type { Session } from '@myhome/shared';
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
  signIn: (session: Session) => void;
  /** Marks a new customer's profile as completed. */
  completeProfile: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => readPreferences().session);
  const [status, setStatus] = useState<Status>(() =>
    readPreferences().session ? 'restoring' : 'ready',
  );

  // Re-attach the stored session to the API (as a real client would send its token).
  useEffect(() => {
    const stored = readPreferences().session;
    if (!stored) return;
    let active = true;
    api.auth
      .restoreSession(stored)
      .catch(() => {
        writePreferences({ session: null });
        if (active) setSession(null);
      })
      .finally(() => active && setStatus('ready'));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback((next: Session) => {
    writePreferences({ session: next });
    setSession(next);
  }, []);

  const completeProfile = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, isNewUser: false };
      writePreferences({ session: next });
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.auth.signOut();
    } finally {
      writePreferences({ session: null });
      setSession(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, session, signIn, completeProfile, signOut }),
    [status, session, signIn, completeProfile, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
