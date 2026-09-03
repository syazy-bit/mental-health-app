/**
 * Tests for AuthProvider: bootstrap, login, logout, and anonymous coexistence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { clearAuthState, getAccessToken } from '@/lib/auth-api';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown, init?: RequestInit) => impl(String(url), init))
  );
}

const ME = { id: 'u-1', email: 's@example.com', display_name: 'Sam', created_at: '2026-01-01' };
const TOKEN = 'tok-1';

function Probe() {
  const { user, status, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button type="button" onClick={() => login('s@example.com', 'long-enough-pw').catch(() => {})}>
        do-login
      </button>
      <button type="button" onClick={() => logout()}>
        do-logout
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(() => {
  clearAuthState();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('bootstrap', () => {
  it('becomes authenticated when the refresh cookie is valid', async () => {
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/refresh')) {
        return json({ access_token: TOKEN, token_type: 'bearer', expires_in: 900 });
      }
      return json(ME);
    });
    renderProbe();
    expect(screen.getByTestId('status')).toHaveTextContent('initializing');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('s@example.com');
  });

  it('stays anonymous without an app-breaking error when refresh fails', async () => {
    installFetch(async () => json({ detail: 'nope' }, 401));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(getAccessToken()).toBeNull();
  });
});

describe('login / logout', () => {
  it('logs in and populates the user', async () => {
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
      if (url.endsWith('/api/auth/login')) {
        return json({ access_token: TOKEN, token_type: 'bearer', expires_in: 900 });
      }
      return json(ME);
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    fireEvent.click(screen.getByText('do-login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('s@example.com');
  });

  it('returns to anonymous and clears the token on login failure', async () => {
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
      return json({ detail: 'Invalid credentials' }, 401);
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    fireEvent.click(screen.getByText('do-login'));
    await waitFor(() => expect(getAccessToken()).toBeNull());
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('logs out via the backend and clears state', async () => {
    const seen: string[] = [];
    installFetch(async (url) => {
      seen.push(url);
      if (url.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
      if (url.endsWith('/api/auth/login')) {
        return json({ access_token: TOKEN, token_type: 'bearer', expires_in: 900 });
      }
      if (url.endsWith('/api/auth/logout')) return new Response(null, { status: 204 });
      return json(ME);
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    fireEvent.click(screen.getByText('do-login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    fireEvent.click(screen.getByText('do-logout'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(seen.some((u) => u.endsWith('/api/auth/logout'))).toBe(true);
    expect(getAccessToken()).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });
});

describe('anonymous compatibility', () => {
  it('preserves mh_session_id and stores no credentials', async () => {
    sessionStorage.setItem('mh_session_id', 'anon-uuid-123');
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
      if (url.endsWith('/api/auth/login')) {
        return json({ access_token: TOKEN, token_type: 'bearer', expires_in: 900 });
      }
      return json(ME);
    });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    fireEvent.click(screen.getByText('do-login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    // Anonymous identity untouched; no token material in browser storage.
    expect(sessionStorage.getItem('mh_session_id')).toBe('anon-uuid-123');
    const storedValues: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key) storedValues.push(sessionStorage.getItem(key) ?? '');
    }
    expect(storedValues.some((v) => v.includes(TOKEN))).toBe(false);
  });
});
