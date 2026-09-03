/**
 * Tests for the student registration page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { clearAuthState } from '@/lib/auth-api';
import RegisterPage from '@/app/(student)/register/page';

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

const ME = { id: 'u-1', email: 's@example.com', display_name: 'Sam', created_at: '2026-01-01' };

function renderPage() {
  return render(
    <AuthProvider>
      <RegisterPage />
    </AuthProvider>
  );
}

function fillAll(password = 'long-enough-pw', confirm?: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 's@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: confirm ?? password },
  });
}

beforeEach(() => {
  clearAuthState();
  nav.replace.mockClear();
  vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'nope' }, 401)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('register page', () => {
  it('rejects mismatched passwords client-side', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Confirm password')).toBeInTheDocument());
    fillAll('long-enough-pw', 'different-pw-12');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
  });

  it('rejects short passwords client-side', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Confirm password')).toBeInTheDocument());
    fillAll('short', 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 12 characters');
  });

  it('shows a friendly duplicate-email error on 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        if (String(url).endsWith('/api/auth/register')) {
          return json({ detail: 'An account with this email already exists.' }, 409);
        }
        return json({ detail: 'nope' }, 401);
      })
    );
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Confirm password')).toBeInTheDocument());
    fillAll();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });

  it('registers and navigates home on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.endsWith('/api/auth/refresh')) return json({ detail: 'nope' }, 401);
        if (u.endsWith('/api/auth/register')) {
          return json({ access_token: 'tok', token_type: 'bearer', expires_in: 900 }, 201);
        }
        return json(ME);
      })
    );
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Confirm password')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Display name/), { target: { value: 'Sam' } });
    fillAll();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/'));
  });
});
