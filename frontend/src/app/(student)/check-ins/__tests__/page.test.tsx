/**
 * Tests for the Phase 3C "My Check-ins" page (@/app/(student)/check-ins).
 *
 * Covers: auth gating (anonymous never fetches), loading skeletons, empty
 * state, PHQ-9/GAD-7 sections, trend rules end-to-end, Item-9 suppression,
 * retake navigation, error + retry, 401 login redirect, and responsive
 * classes. Bearer-token behavior itself is covered in lib/__tests__/checkins.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthApiError } from '@/lib/auth-api';
import type { ScreeningHistoryItem } from '@/lib/types';
import CheckinsPage from '@/app/(student)/check-ins/page';

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown } as {
    status: string;
    user: { id: string; email: string; display_name: null; created_at: string } | null;
  },
}));

const checkinsMock = vi.hoisted(() => ({ fn: vi.fn() }));
const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: '/check-ins' }));

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
    render(<CheckinsPage />);
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith('/login?next=%2Fcheck-ins')
    );
    expect(checkinsMock.fn).not.toHaveBeenCalled();
    expect(screen.queryByText('My Check-ins')).toBeNull();
  });

  it('authenticated visitors trigger exactly one history load', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    render(<CheckinsPage />);
    await waitFor(() => expect(checkinsMock.fn).toHaveBeenCalledTimes(1));
    expect(checkinsMock.fn).toHaveBeenCalledWith({ status: 'authenticated', user: ME });
  });
});

describe('loading state', () => {
  it('shows skeleton placeholders while history loads', () => {
    authed();
    checkinsMock.fn.mockReturnValue(new Promise(() => {}));
    render(<CheckinsPage />);
    expect(
      screen.getByRole('status', { name: 'Loading your check-in history' })
    ).toBeInTheDocument();
  });
});

describe('empty state', () => {
  it('shows the calm empty state with a first check-in CTA', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([]));
    render(<CheckinsPage />);
    expect(await screen.findByText('No check-ins yet')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Take your first check-in' })
    ).toHaveAttribute('href', '/screening');
  });
});

describe('populated history', () => {
  it('renders PHQ-9 and GAD-7 sections with entries and retake links', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(
      historyResponse([
        item({ id: 'h-1', instrument: 'PHQ9', total_score: 12, severity: 'Moderate' }),
        item({
          id: 'g-1',
          instrument: 'GAD7',
          total_score: 6,
          severity: 'Mild',
          created_at: '2026-08-20T12:00:00.000Z',
        }),
      ])
    );
    const { container } = render(<CheckinsPage />);
    expect(await screen.findByRole('heading', { name: 'PHQ-9 history' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GAD-7 history' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retake PHQ-9/ })).toHaveAttribute(
      'href',
      '/screening/phq9'
    );
    expect(screen.getByRole('link', { name: /Retake GAD-7/ })).toHaveAttribute(
      'href',
      '/screening/gad7'
    );
    // Single result per instrument: no trend language anywhere.
    expect(container.textContent).not.toMatch(/over time|most recent|side by side/i);
    expect(container.textContent).not.toMatch(/better|worse|improv|declin|deterior|recover/i);
  });

  it('3+ results show a neutral trajectory without directional judgment', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(
      historyResponse([
        item({ id: 'h-3', total_score: 9, created_at: '2026-09-10T12:00:00.000Z' }),
        item({ id: 'h-2', total_score: 6, created_at: '2026-08-20T12:00:00.000Z' }),
        item({ id: 'h-1', total_score: 12, created_at: '2026-07-15T12:00:00.000Z' }),
      ])
    );
    const { container } = render(<CheckinsPage />);
    expect(
      await screen.findByText('Your PHQ-9 check-in scores over time')
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/better|worse|improv|declin|deterior|recover/i);
  });

  it('flagged entries get supportive framing; the raw Item-9 number stays hidden', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(
      historyResponse([
        item({
          id: 'h-flag',
          total_score: 16,
          severity: 'Moderately severe',
          safety_flag: true,
          item9_score: 3,
        }),
      ])
    );
    const { container } = render(<CheckinsPage />);
    await screen.findByRole('heading', { name: 'PHQ-9 history' });
    // A lone entry starts expanded; expand only if collapsed.
    const collapsed = container.querySelector(
      'button[aria-expanded="false"]'
    ) as HTMLButtonElement | null;
    if (collapsed) {
      fireEvent.click(collapsed);
    }
    expect(screen.getByText(/You noted difficult thoughts at the time/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View all support options' })
    ).toHaveAttribute('href', '/support-now');
    expect(screen.queryByText('3', { exact: true })).toBeNull();
    expect(container.textContent).not.toMatch(/item.?9/i);
  });

  it('keeps the responsive layout system (stack on mobile, rows from sm up)', async () => {
    authed();
    checkinsMock.fn.mockResolvedValue(historyResponse([item()]));
    const { container } = render(<CheckinsPage />);
    await screen.findByRole('heading', { name: 'PHQ-9 history' });
    expect(container.querySelector('[class*="sm:"]')).toBeInTheDocument();
  });
});

describe('error states', () => {
  it('shows an error with retry, and retry reloads history', async () => {
    authed();
    checkinsMock.fn.mockRejectedValueOnce(new Error('boom'));
    const { container } = render(<CheckinsPage />);
    expect(await screen.findByText("We couldn't load your check-ins")).toBeInTheDocument();
    expect(container.querySelector('[class*="sm:"]')).toBeInTheDocument();

    checkinsMock.fn.mockResolvedValueOnce(historyResponse([item()]));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'PHQ-9 history' })).toBeInTheDocument();
    expect(checkinsMock.fn).toHaveBeenCalledTimes(2);
  });

  it('401 maps to a session-expired message with a login link (no anonymous fallback)', async () => {
    authed();
    checkinsMock.fn.mockRejectedValue(new AuthApiError(401, 'Could not validate credentials'));
    render(<CheckinsPage />);
    expect(await screen.findByText(/Your sign-in has expired/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log in again/ })).toHaveAttribute(
      'href',
      '/login?next=%2Fcheck-ins'
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
