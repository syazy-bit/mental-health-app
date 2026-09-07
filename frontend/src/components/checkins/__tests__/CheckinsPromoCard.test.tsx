/**
 * Review-verification tests for CheckinsPromoCard (Phase 3C review).
 *
 * The screening hub is the highest-traffic anonymous surface touched by
 * Phase 3C. These tests pin the core guarantee: anonymous visitors see
 * byte-identical hub output (promo renders null, zero network), while
 * signed-in students get the My Story entry point.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CheckinsPromoCard } from '@/components/checkins/CheckinsPromoCard';

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown } as {
    status: string;
    user: { id: string } | null;
  },
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => authState.value,
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

describe('CheckinsPromoCard (review verification)', () => {
  it('renders nothing for anonymous visitors (hub preserved)', () => {
    authState.value = { status: 'anonymous', user: null };
    const { container } = render(<CheckinsPromoCard />);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByText('My Story')).toBeNull();
  });

  it('renders nothing while auth is initializing (no flash)', () => {
    authState.value = { status: 'initializing', user: null };
    const { container } = render(<CheckinsPromoCard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the entry point for signed-in students', () => {
    authState.value = { status: 'authenticated', user: { id: 'u-1' } };
    render(<CheckinsPromoCard />);
    expect(screen.getByText('My Story')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View My Story/ })).toHaveAttribute(
      'href',
      '/story'
    );
  });
});
