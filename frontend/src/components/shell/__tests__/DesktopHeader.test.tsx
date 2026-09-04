/**
 * Tests for the L1 responsive header transition (Phase 3C final polish).
 *
 * Strategy under test: the desktop pill bar renders for visitors without an
 * account session at xl+ only (measured settled content needs viewport >=
 * ~1170px); signed-in students get the compact header (account indicator +
 * actions) with My Check-ins in the bottom navigation and screening hub.
 * The bar never clips, overlaps, or scrolls.
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

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => authState.value,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
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

describe('DesktopHeader responsive transition (L1)', () => {
  it('anonymous visitors get the 6-pill bar at xl+ with no scroll or clipping utilities', () => {
    authState.value = { status: 'anonymous', user: null, logout: vi.fn() };
    renderHeader();
    const bar = nav();
    expect(bar).toBeInTheDocument();
    expect(bar?.className).toMatch(/hidden xl:flex/);
    expect(bar?.className).not.toMatch(/overflow-x-auto/);
    const pills = within(bar as HTMLElement).getAllByRole('link');
    expect(pills).toHaveLength(6);
    expect(
      within(bar as HTMLElement).queryByRole('link', { name: 'My Check-ins' })
    ).toBeNull();
    for (const pill of pills) {
      expect(pill.getAttribute('href')).toMatch(/^\//);
    }
  });

  it('shows the bar while auth resolves (no layout shift for anonymous load)', () => {
    authState.value = { status: 'initializing', user: null, logout: vi.fn() };
    renderHeader();
    expect(nav()).toBeInTheDocument();
  });

  it('signed-in students get the compact header: no pill bar, controls usable', () => {
    authState.value = {
      status: 'authenticated',
      user: { id: 'u-1', email: 's@example.com' },
      logout: vi.fn(),
    };
    renderHeader();
    // No pill bar at any width for account sessions (it cannot fit).
    expect(nav()).toBeNull();
    // Brand, account indicator, auth controls, and Support Now remain.
    expect(screen.getByRole('link', { name: /MindBridge/ })).toHaveAttribute('href', '/');
    expect(screen.getByText(/Signed in/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support Now' })).toHaveAttribute(
      'href',
      '/support-now'
    );
  });
});
