'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AdminMe } from '@/lib/admin-types';
import {
  clearAdminToken,
  hasAdminToken,
} from '@/lib/admin-auth';
import { getCurrentAdmin, setUnauthorizedHandler } from '@/lib/admin-api';

interface AdminSessionValue {
  admin: AdminMe | null;
  status: 'checking' | 'ready' | 'redirecting';
  logout: () => void;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export const AdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [status, setStatus] = useState<'checking' | 'ready' | 'redirecting'>(
    () => (hasAdminToken() ? 'checking' : 'redirecting')
  );

  useEffect(() => {
    if (!hasAdminToken()) {
      router.replace('/admin/login');
      return;
    }

    let cancelled = false;
    getCurrentAdmin()
      .then((me) => {
        if (!cancelled) {
          setAdmin(me);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('redirecting');
          router.replace('/admin/login');
        }
      });

    const handler = () => {
      if (!cancelled) {
        setStatus('redirecting');
        router.replace('/admin/login');
      }
    };
    setUnauthorizedHandler(handler);

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, [router]);

  const logout = useCallback(() => {
    clearAdminToken();
    setUnauthorizedHandler(null);
    setStatus('redirecting');
    router.replace('/admin/login');
  }, [router]);

  const value = useMemo(
    () => ({ admin, status, logout }),
    [admin, status, logout]
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }
return ctx;
}