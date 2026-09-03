'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { StudentUser } from '@/lib/auth-types';
import {
  AuthApiError,
  clearAuthState,
  fetchCurrentUser,
  loginStudent,
  logoutStudent,
  refreshAccessToken,
  registerStudent,
} from '@/lib/auth-api';

export type AuthStatus =
  | 'initializing'
  | 'anonymous'
  | 'authenticating'
  | 'authenticated';

interface AuthContextValue {
  user: StudentUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial bootstrap: no access token exists in memory on page load, so try
  // the backend HttpOnly refresh cookie once. Failure means anonymous — never
  // an app-breaking error. Anonymous session (mh_session_id) is untouched.
  useEffect(() => {
    let cancelled = false;
    refreshAccessToken()
      .then(() => fetchCurrentUser())
      .then((me) => {
        if (!cancelled && mountedRef.current) {
          setUser(me);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          clearAuthState();
          setStatus('anonymous');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setStatus('authenticating');
    try {
      await loginStudent({ email, password });
      const me = await fetchCurrentUser();
      if (!mountedRef.current) return;
      setUser(me);
      setStatus('authenticated');
    } catch (error) {
      if (mountedRef.current) {
        clearAuthState();
        setStatus('anonymous');
      }
      throw error;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setStatus('authenticating');
      try {
        // Backend registration issues credentials directly (201 + token
        // response + refresh cookie), so no separate login step is needed.
        await registerStudent({ email, password, display_name: displayName });
        const me = await fetchCurrentUser();
        if (!mountedRef.current) return;
        setUser(me);
        setStatus('authenticated');
      } catch (error) {
        if (mountedRef.current) {
          clearAuthState();
          setStatus('anonymous');
        }
        throw error;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutStudent();
    if (mountedRef.current) {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Map backend auth errors to safe, user-facing messages (no internals). */
export function toFriendlyAuthError(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.status === 401) return 'Incorrect email or password.';
    if (error.status === 409)
      return 'An account with this email already exists. Try logging in instead.';
    if (error.status === 422) return error.message || 'Please check your details and try again.';
    if (error.status === 429)
      return 'Too many attempts. Please wait a moment and try again.';
    if (error.status === 0) return 'Unable to reach the server. Please check your connection.';
    return 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
