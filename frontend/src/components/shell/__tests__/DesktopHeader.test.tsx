/**
 * Review-verification tests for the L1 header-crowding fix (Phase 3C polish).
 *
 * The signed-in pill bar (7 links + account state) exceeds the fixed header
 * width at md–lg viewports. The fix mirrors the existing resources-page
 * pill-row pattern: the nav shrinks and scrolls instead of pushing
 * brand/actions off-screen, with rendering unchanged wherever everything
 * already fits. These tests pin that behavior.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '@/lib/theme';
import { DesktopHeader } from '@/components/shell/DesktopHeader';

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown, logout: vi.fn() } as {
    status: string;
    user: { id: string; email: string } | null;
    logout: () => Promise<void>;
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
  return screen.getByRole('navigation', { name: 'Main Navigation' });
}

describe('DesktopHeader overflow behavior (L1)', () => {
  it('pill nav scrolls instead of clipping (anonymous baseline)', () => {
    authState.value = { status: 'anonymous', user: null, logout: vi.fn() };
    renderHeader();
    expect(nav().className).toMatch(/overflow-x-auto/);
    expect(screen.queryByRole('link', { name: 'My Check-ins' })).toBeNull();
  });

  it('signed-in pill bar scrolls instead of clipping, all links usable', () => {
    authState.value = {
      status: 'authenticated',
      user: { id: 'u-1', email: 's@example.com' },
      logout: vi.fn(),
    };
    renderHeader();
    const bar = nav();
    expect(bar.className).toMatch(/overflow-x-auto/);
    // The Phase 3C entry is present for signed-in students…
    expect(
      within(bar).getByRole('link', { name: 'My Check-ins' })
    ).toHaveAttribute('href', '/check-ins');
    // The Phase 3C entry is present for signed-in students…
    expect(
      within(bar).getByRole('link', { name: 'My Check-ins' })
    ).toHaveAttribute('href', '/check-ins');
    // …alongside every existing entry — nothing removed, all usable.
    const pills = within(bar).getAllByRole('link');
    expect(pills.length).toBeGreaterThanOrEqual(7);
    for (const pill of pills) {
      expect(pill.getAttribute('href')).toMatch(/^\//);
    }
  });
});
