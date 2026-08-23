// Auth session for the admin area. Holds the JWT + current admin in React context,
// persists the token via the platform token store (Keychain/Keystore on native,
// localStorage on web), and validates it against /me on boot.
//
// The kid area needs none of this — it is unauthenticated — but the provider wraps the
// whole app so the boot-time token check runs once and the admin group can guard on it.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Admin, ApiError, getMe, login as apiLogin } from './api';
import { deleteToken as clearStoredToken, getToken as loadStoredToken, setToken as storeToken } from './token-store';

const TOKEN_KEY = 'chore_admin_token';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: Status;
  token: string | null;
  user: Admin | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Admin | null>(null);

  // Boot: read a stored token. If one exists, trust it optimistically and go straight to
  // signedIn, then confirm against /me in the background. Only a real 401 (token actually
  // invalid/expired) clears the session — a transient failure (network blip, a 5xx, the
  // backend briefly down during a deploy) must NOT log a valid user out.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadStoredToken(TOKEN_KEY);
      if (!stored) {
        if (active) setStatus('signedOut');
        return;
      }
      if (active) {
        setToken(stored);
        setStatus('signedIn');
      }
      try {
        const admin = await getMe(stored);
        if (active) setUser(admin);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearStoredToken(TOKEN_KEY);
          if (active) {
            setToken(null);
            setUser(null);
            setStatus('signedOut');
          }
        }
        // Non-auth errors: keep the session; /me will be retried on the next boot.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      token,
      user,
      async signIn(email, password) {
        const result = await apiLogin(email, password);
        await storeToken(TOKEN_KEY, result.token);
        setToken(result.token);
        setUser(result.user);
        setStatus('signedIn');
      },
      async signOut() {
        await clearStoredToken(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setStatus('signedOut');
      },
    }),
    [status, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return ctx;
}
