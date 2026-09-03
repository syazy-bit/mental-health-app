/**
 * Tests for the student login page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { clearAuthState } from '@/lib/auth-api';
import LoginPage from '@/app/(student)/login/page';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ME = { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' };

function renderPage() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}

function fillValid(email = 's@example.com', password = 'long-enough-pw') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

beforeEach(() => {
  clearAuthState();
  nav.replace.mockClear();
  // Bootstrap: no refresh cookie -> anonymous.
  vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'nope' }, 401)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('login page', () => {
  it('requires email and password', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter both your email and password.');
  });

  it('rejects an invalid email address client-side', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
    fillValid('not-an-email');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
  });

  it('logs in and navigates home on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
        if (u.endsWith('/api/auth/login')) {
          return json({ access_token: 'tok', token_type: 'bearer', expires_in: 900 });
        }
        return json(ME);
      })
    );
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/'));
  });

  it('shows a friendly error on invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        if (String(url).endsWith('/api/auth/login')) {
          return json({ detail: 'Invalid credentials' }, 401);
        }
        return json({ detail: 'nope' }, 401);
      })
    );
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('shows a loading state while submitting', async () => {
    let resolveLogin!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
        if (u.endsWith('/api/auth/login')) {
          return new Promise<Response>((resolve) => {
            resolveLogin = resolve;
          });
        }
        return json(ME);
      })
    );
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Loading...')).toBeInTheDocument();
    resolveLogin(json({ access_token: 'tok', token_type: 'bearer', expires_in: 900 }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/'));
  });
});
