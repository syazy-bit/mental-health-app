/**
 * Tests for the finalized five-destination desktop header.
 *
 * The pill bar holds exactly Home / Talk / My Story / Tools / Counseling
 * at xl+ for every auth state (including while auth resolves, so there is
 * no layout shift). Support Now is a separate persistent action, never a
 * pill. The bar never clips, overlaps, or scrolls.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '@/lib/theme';
import { DesktopHeader } from '@/components/shell/DesktopHeader';

const authState = vi.hoisted(() => ({
  value: {
    status: 'anonymous' as string,
    user: null as unknown as { id: string; email: string } | null,
    logout: vi.fn(),
  },
}));

const navState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => authState.value,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => navState.pathname,
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

function renderHeader() {
  return render(
    <ThemeProvider>
      <DesktopHeader />
    </ThemeProvider>
  );
}

function nav() {
  return screen.queryByRole('navigation', { name: 'Main Navigation' });
}

function expectFivePills() {
  const bar = nav();
  expect(bar).toBeInTheDocument();
  expect(bar?.className).toMatch(/hidden xl:flex/);
  expect(bar?.className).not.toMatch(/overflow-x-auto/);
  const pills = within(bar as HTMLElement).getAllByRole('link');
  expect(pills).toHaveLength(5);
  expect(pills.map((p) => p.getAttribute('href'))).toEqual([
    '/',
    '/chat',
    '/story',
    '/resources',
    '/booking',
  ]);
  expect(pills.map((p) => p.textContent)).toEqual([
    'Home',
    'Talk',
    'My Story',
    'Tools',
    'Counseling',
  ]);
  return bar as HTMLElement;
}

describe('DesktopHeader five-destination IA', () => {
  it('anonymous visitors get the 5-pill bar with no scroll or clipping utilities', () => {
    authState.value = { status: 'anonymous', user: null, logout: vi.fn() };
    navState.pathname = '/';
    renderHeader();
    expectFivePills();
  });

  it('shows the identical 5-pill bar while auth resolves (no layout shift)', () => {
    authState.value = { status: 'initializing', user: null, logout: vi.fn() };
    navState.pathname = '/';
    renderHeader();
    expectFivePills();
  });

  it('signed-in students get the same 5-pill bar plus account controls', () => {
    authState.value = {
      status: 'authenticated',
      user: { id: 'u-1', email: 's@example.com' },
      logout: vi.fn(),
    };
    navState.pathname = '/story';
    renderHeader();
    const bar = expectFivePills();
    expect(
      within(bar).getByRole('link', { name: 'My Story' })
    ).toHaveAttribute('aria-current', 'page');
    // Account indicator, auth controls, and Support Now remain alongside.
    expect(screen.getByRole('link', { name: /MindBridge/ })).toHaveAttribute('href', '/');
    expect(screen.getByText(/Signed in/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support Now' })).toHaveAttribute(
      'href',
      '/support-now'
    );
  });

  it('has no Check-ins, Assessments, Resources, or About pills', () => {
    authState.value = { status: 'anonymous', user: null, logout: vi.fn() };
    navState.pathname = '/';
    renderHeader();
    const bar = nav() as HTMLElement;
    for (const name of ['Check-ins', 'Assessments', 'Resources', 'About & Privacy']) {
      expect(within(bar).queryByRole('link', { name })).toBeNull();
    }
  });

  it('keeps Support Now outside the pill bar', () => {
    authState.value = { status: 'anonymous', user: null, logout: vi.fn() };
    navState.pathname = '/';
    renderHeader();
    const bar = nav() as HTMLElement;
    expect(within(bar).queryByRole('link', { name: 'Support Now' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Support Now' })).toHaveAttribute(
      'href',
      '/support-now'
    );
  });

  it('marks Tools active on the resources route (label-only rename)', () => {
    authState.value = { status: 'anonymous', user: null, logout: vi.fn() };
    navState.pathname = '/resources';
    renderHeader();
    const bar = nav() as HTMLElement;
    expect(within(bar).getByRole('link', { name: 'Tools' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
