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

  // Boot: read a stored token and confirm it still works. A missing token or a 401
  // lands on signedOut; status stays 'loading' until this resolves so the admin group
  // never flashes the login screen for an already-signed-in user.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadStoredToken(TOKEN_KEY);
      if (!stored) {
        if (active) setStatus('signedOut');
        return;
      }
      try {
        const admin = await getMe(stored);
        if (!active) return;
        setToken(stored);
        setUser(admin);
        setStatus('signedIn');
      } catch (err) {
        // Stale or invalid token: drop it and sign out. Rethrow anything that is not an
        // auth failure so a transient network error does not silently wipe the session.
        if (err instanceof ApiError && err.status === 401) {
          await clearStoredToken(TOKEN_KEY);
          if (active) setStatus('signedOut');
        } else if (active) {
          setStatus('signedOut');
        }
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
