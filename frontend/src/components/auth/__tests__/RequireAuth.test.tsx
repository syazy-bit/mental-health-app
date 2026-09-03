/**
 * Tests for RequireAuth: loading state, redirect, and access control.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { clearAuthState } from '@/lib/auth-api';

const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: '/protected' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
}));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ME = { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' };

function renderGuard() {
  return render(
    <AuthProvider>
      <RequireAuth>
        <span>secret-content</span>
      </RequireAuth>
    </AuthProvider>
  );
}

beforeEach(() => {
  clearAuthState();
  nav.replace.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RequireAuth', () => {
  it('shows a loading state while initializing (no flash)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return json({ detail: 'nope' }, 401);
      })
    );
    renderGuard();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
  });

  it('redirects anonymous users to login with next, rendering nothing protected', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'nope' }, 401)));
    renderGuard();
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith('/login?next=%2Fprotected')
    );
    expect(screen.queryByText('secret-content')).toBeNull();
  });

  it('renders children for authenticated users without redirecting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        if (String(url).endsWith('/api/auth/refresh')) {
          return json({ access_token: 'tok', token_type: 'bearer', expires_in: 900 });
        }
        return json(ME);
      })
    );
    renderGuard();
    await waitFor(() => expect(screen.getByText('secret-content')).toBeInTheDocument());
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
