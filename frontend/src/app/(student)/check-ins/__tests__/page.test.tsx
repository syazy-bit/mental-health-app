/**
 * Tests for the /check-ins compatibility redirect.
 *
 * /check-ins is a legacy route: it silently replaces to /story (which
 * renders the same owned history sections), so existing links and
 * bookmarks keep working. No history fetch happens here; /story performs
 * the single authenticated load. Anonymous visitors land on /story, whose
 * RequireAuth sends them to login with next=%2Fstory.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CheckinsRedirectPage from '@/app/(student)/check-ins/page';

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown } as {
    status: string;
    user: { id: string } | null;
  },
}));

const checkinsMock = vi.hoisted(() => ({ fn: vi.fn() }));
const replaceMock = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => authState.value,
}));

vi.mock('@/lib/checkins', () => ({
  fetchCheckinHistory: (...args: unknown[]) => checkinsMock.fn(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock.fn }),
  usePathname: () => '/check-ins',
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

describe('/check-ins compatibility redirect', () => {
  it('authenticated visitors are replaced to /story with no history fetch', async () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    replaceMock.fn.mockClear();
    checkinsMock.fn.mockClear();
    render(<CheckinsRedirectPage />);
    await waitFor(() =>
      expect(replaceMock.fn).toHaveBeenCalledWith('/story')
    );
    expect(checkinsMock.fn).not.toHaveBeenCalled();
  });

  it('anonymous visitors are replaced to /story with no history fetch', async () => {
    authState.value = { status: 'anonymous', user: null };
    replaceMock.fn.mockClear();
    checkinsMock.fn.mockClear();
    render(<CheckinsRedirectPage />);
    await waitFor(() =>
      expect(replaceMock.fn).toHaveBeenCalledWith('/story')
    );
    expect(checkinsMock.fn).not.toHaveBeenCalled();
  });

  it('renders a neutral loading status and no history content while redirecting', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    replaceMock.fn.mockClear();
    render(<CheckinsRedirectPage />);
    expect(
      screen.getByRole('status', { name: 'Opening your Story' })
    ).toBeInTheDocument();
    expect(screen.queryByText('My Check-ins')).toBeNull();
    expect(screen.queryByText('PHQ-9 history')).toBeNull();
  });
});
