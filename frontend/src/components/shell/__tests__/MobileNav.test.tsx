/**
 * Tests for the finalized five-destination student navigation.
 *
 * The bottom navigation holds exactly Home / Talk / My Story / Tools /
 * Counseling for every auth state. Support Now is a header action, never
 * a tab. Legacy routes (/check-ins, /screening) stay reachable but have
 * no primary tab.
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

const EXPECTED_HREFS = ['/', '/chat', '/story', '/resources', '/booking'];
const EXPECTED_LABELS = ['Home', 'Talk', 'My Story', 'Tools', 'Counseling'];

function bottomNav() {
  return screen.getByRole('navigation', { name: 'Mobile Bottom Navigation' });
}

function tabs() {
  return within(bottomNav()).getAllByRole('link');
}

describe('MobileNav five-destination IA', () => {
  it('anonymous visitors get exactly the five primary destinations', () => {
    authState.value = { status: 'anonymous', user: null };
    navState.pathname = '/';
    render(<MobileNav />);
    const links = tabs();
    expect(links).toHaveLength(5);
    expect(links.map((t) => t.getAttribute('href'))).toEqual(EXPECTED_HREFS);
    expect(links.map((t) => t.textContent)).toEqual(EXPECTED_LABELS);
  });

  it('authenticated visitors get the identical five destinations (no extra tabs)', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/';
    render(<MobileNav />);
    const links = tabs();
    expect(links).toHaveLength(5);
    expect(links.map((t) => t.getAttribute('href'))).toEqual(EXPECTED_HREFS);
    expect(links.map((t) => t.textContent)).toEqual(EXPECTED_LABELS);
  });

  it('has no Check-ins, Assessments, or Resources primary item', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/';
    render(<MobileNav />);
    expect(
      within(bottomNav()).queryByRole('link', { name: 'Check-ins' })
    ).toBeNull();
    expect(
      within(bottomNav()).queryByRole('link', { name: 'Assessments' })
    ).toBeNull();
    expect(
      within(bottomNav()).queryByRole('link', { name: 'Resources' })
    ).toBeNull();
  });

  it('keeps Support Now out of the bottom navigation', () => {
    authState.value = { status: 'anonymous', user: null };
    navState.pathname = '/';
    render(<MobileNav />);
    expect(
      within(bottomNav()).queryByRole('link', { name: 'Support Now' })
    ).toBeNull();
  });

  it('marks My Story active on /story', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/story';
    render(<MobileNav />);
    expect(
      within(bottomNav()).getByRole('link', { name: 'My Story' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('marks Home active only on the exact root path', () => {
    authState.value = { status: 'anonymous', user: null };
    navState.pathname = '/story';
    render(<MobileNav />);
    expect(
      within(bottomNav()).getByRole('link', { name: 'Home' })
    ).not.toHaveAttribute('aria-current');
  });

  it('marks Tools active on the resources route (label-only rename)', () => {
    authState.value = { status: 'anonymous', user: null };
    navState.pathname = '/resources';
    render(<MobileNav />);
    const tools = within(bottomNav()).getByRole('link', { name: 'Tools' });
    expect(tools).toHaveAttribute('href', '/resources');
    expect(tools).toHaveAttribute('aria-current', 'page');
  });

  it('renders no active tab on legacy non-primary routes', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/check-ins';
    render(<MobileNav />);
    for (const tab of tabs()) {
      expect(tab).not.toHaveAttribute('aria-current');
    }
  });

  it('never scrolls horizontally: fixed five-tab flex with no overflow utilities', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    navState.pathname = '/';
    render(<MobileNav />);
    expect(bottomNav().className).toMatch(/xl:hidden/);
    expect(bottomNav().className).not.toMatch(/overflow-x-auto/);
    expect(bottomNav().className).not.toMatch(/overflow-x-scroll/);
    for (const tab of tabs()) {
      expect(tab.className).not.toMatch(/text-\[8px\]/);
    }
  });
});
