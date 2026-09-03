'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * Client-side guard for authenticated-only student routes.
 *
 * - While auth is initializing, renders an inline loading state so protected
 *   UI never flashes before a redirect decision (no auth flash).
 * - When anonymous, redirects to /login?next=<original path> (no loops: the
 *   login page itself must never be wrapped in RequireAuth).
 * - Anonymous access to the rest of the app is unaffected; wrap only routes
 *   that genuinely require an account.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [status, pathname, router]);

  if (status === 'initializing' || status === 'authenticating') {
    return (
      <div
        className="flex-1 flex items-center justify-center px-4 py-16"
        role="status"
        aria-label="Checking your session"
      >
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-[#AAB6B1]">
          <span
            className="inline-block w-4 h-4 rounded-full border-2 border-slate-300 dark:border-[#34413D] border-t-[#0D5C56] dark:border-t-[#4FA79D] animate-spin"
            aria-hidden="true"
          />
          Checking your session…
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
