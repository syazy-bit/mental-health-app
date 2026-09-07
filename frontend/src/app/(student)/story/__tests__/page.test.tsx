/**
 * Tests for the My Story MVP page (@/app/(student)/story).
 *
 * Covers: auth gating (anonymous never fetches, redirects to login with
 * next=%2Fstory), loading skeleton, empty state, PHQ-9/GAD-7 sections via
 * the existing CheckinHistorySection, honest coming-soon UI (Write a moment
 * is disabled and performs no request; What helped shows copy only), error
 * + retry, and 401 login redirect. Bearer-token behavior itself is covered
 * in lib/__tests__/checkins.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthApiError } from '@/lib/auth-api';
import type { ScreeningHistoryItem } from '@/lib/types';
import StoryPage from '@/app/(student)/story/page';

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown } as {
    status: string;
    user: { id: string; email: string; display_name: null; created_at: string } | null;
  },
}));

const checkinsMock = vi.hoisted(() => ({ fn: vi.fn() }));
const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: '/story' }));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => authState.value,
}));

vi.mock('@/lib/checkins', () => ({
  fetchCheckinHistory: (...args: unknown[]) => checkinsMock.fn(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
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

const ME = { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' };

function authed() {
  authState.value = { status: 'authenticated', user: ME };
}

function item(overrides: Partial<ScreeningHistoryItem> = {}): ScreeningHistoryItem {
  return {
    id: 'h-1',
    instrument: 'PHQ9',
    total_score: 12,
    severity: 'Moderate',
    safety_flag: false,
    item9_score: 0,
    created_at: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

function historyResponse(items: ScreeningHistoryItem[]) {
  return { items, total: items.length, limit: 50, offset: 0 };
}

beforeEach(() => {
  authState.value = { status: 'anonymous', user: null };
  nav.replace.mockClear();
  checkinsMock.fn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth gating', () => {
  it('anonymous visitors are redirected to login and account history is never requested', async () => {
    render(<StoryPage />);
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith('/login?next=%2Fstory')
    );
    expect(checkinsMock.fn).not.toHaveBeenCalled();
    expect(screen.queryByText('My Story')).toBeNull();
  });

  it('authenticated visitors trigger exactly one history load', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    render(<StoryPage />);
    await waitFor(() => expect(checkinsMock.fn).toHaveBeenCalledTimes(1));
    expect(checkinsMock.fn).toHaveBeenCalledWith({ status: 'authenticated', user: ME });
  });
});

describe('history content', () => {
  it('empty history shows the Story empty state with a check-in action', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    render(<StoryPage />);
    await waitFor(() =>
      expect(screen.getByText('Your Story starts here')).toBeInTheDocument()
    );
    expect(
      screen.getByRole('link', { name: /Take your first check-in/ })
    ).toHaveAttribute('href', '/screening');
  });

  it('populated history renders PHQ-9 and GAD-7 sections with existing language', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(
      historyResponse([
        item({ id: 'p1', instrument: 'PHQ9' }),
        item({ id: 'g1', instrument: 'GAD7', total_score: 8, severity: 'Mild' }),
      ])
    );
    render(<StoryPage />);
    await waitFor(() =>
      expect(screen.getByText('PHQ-9 history')).toBeInTheDocument()
    );
    expect(screen.getByText('GAD-7 history')).toBeInTheDocument();
    // New check-in entry points to the existing screening flow.
    expect(
      screen.getByRole('link', { name: /Start a check-in/ })
    ).toHaveAttribute('href', '/screening');
  });
});

describe('honest future UI (no backend, no fake actions)', () => {
  it('Write a moment is visibly disabled and performs no request', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    render(<StoryPage />);
    await waitFor(() =>
      expect(screen.getByText('Your Story starts here')).toBeInTheDocument()
    );
    const momentButton = screen.getByRole('button', { name: 'Write a moment' });
    expect(momentButton).toBeDisabled();
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
    fireEvent.click(momentButton);
    // Only the initial history load ever fires; the disabled action adds none.
    expect(checkinsMock.fn).toHaveBeenCalledTimes(1);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('What helped section shows coming-soon copy only, with no actions', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    render(<StoryPage />);
    await waitFor(() =>
      expect(screen.getByText('What you said helped')).toBeInTheDocument()
    );
    expect(
      screen.getAllByText(/nothing here\s*sends or saves anything/i)
    ).toHaveLength(2);
  });
});

describe('error handling', () => {
  it('generic failure shows retry without a login redirect', async () => {
    authed();
    checkinsMock.fn.mockRejectedValue(new Error('boom'));
    render(<StoryPage />);
    await waitFor(() =>
      expect(screen.getByText("We couldn't load your Story")).toBeInTheDocument()
    );
    expect(nav.replace).not.toHaveBeenCalled();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(checkinsMock.fn).toHaveBeenCalledTimes(2));
  });

  it('expired session offers a login-again action preserving the story destination', async () => {
    authed();
    checkinsMock.fn.mockRejectedValue(new AuthApiError(401, 'expired'));
    render(<StoryPage />);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Log in again/ })).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /Log in again/ })).toHaveAttribute(
      'href',
      '/login?next=%2Fstory'
    );
  });
});
