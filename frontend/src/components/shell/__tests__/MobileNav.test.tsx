/**
 * Tests for the MobileNav responsive range + account entry (L1 final polish).
 *
 * The bottom navigation covers every viewport below xl (where the desktop
 * pill bar is hidden). Signed-in students additionally get a Check-ins tab;
 * anonymous visitors keep the exact 5-tab bar.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { MobileNav } from '@/components/shell/MobileNav';

const authState = vi.hoisted(() => ({
  value: {
    status: 'anonymous' as string,
    user: null as unknown as { id: string } | null,
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

function bottomNav() {
  return screen.getByRole('navigation', { name: 'Mobile Bottom Navigation' });
}

describe('MobileNav responsive range + account entry (L1)', () => {
  it('shows below lg (covers the widths the desktop pill bar vacates)', () => {
    authState.value = { status: 'anonymous', user: null };
    navState.pathname = '/';
    render(<MobileNav />);
    expect(bottomNav().className).toMatch(/xl:hidden/);
    expect(bottomNav().className).not.toMatch(/md:hidden/);
  });

  it('anonymous visitors keep the exact 5-tab bar', () => {
    authState.value = { status: 'anonymous', user: null };
    navState.pathname = '/';
    render(<MobileNav />);
    const tabs = within(bottomNav()).getAllByRole('link');
    expect(tabs).toHaveLength(5);
    expect(
      within(bottomNav()).queryByRole('link', { name: 'Check-ins' })
    ).toBeNull();
  });

  it('signed-in students get the Check-ins tab without disturbing existing tabs', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/';
    render(<MobileNav />);
    // Account sessions keep bottom navigation at every width: their
    // destinations cannot fit the capped desktop bar anywhere.
    expect(bottomNav().className).not.toMatch(/xl:hidden/);
    const tabs = within(bottomNav()).getAllByRole('link');
    expect(tabs).toHaveLength(6);
    expect(tabs.slice(0, 5).map((t) => t.getAttribute('href'))).toEqual([
      '/',
      '/chat',
      '/screening',
      '/booking',
      '/resources',
    ]);
    expect(
      within(bottomNav()).getByRole('link', { name: 'Check-ins' })
    ).toHaveAttribute('href', '/check-ins');
  });

  it('marks the Check-ins tab active on the history page', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/check-ins';
    render(<MobileNav />);
    expect(
      within(bottomNav()).getByRole('link', { name: 'Check-ins' })
    ).toHaveAttribute('aria-current', 'page');
  });
});
