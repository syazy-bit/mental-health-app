/**
 * Tests for Phase 2C session-state UI:
 * - SessionDisclosure renders the R1 calm disclosure + opens the Dialog explainer
 * - SessionModeBadge renders the signed-in indicator in existing Badge style
 * - DisclaimerStrip keeps anonymous wording by default and switches copy
 *   (structure unchanged) when authenticated
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SessionDisclosure } from '@/components/auth/SessionDisclosure';
import { SessionModeBadge } from '@/components/auth/SessionModeBadge';
import { DisclaimerStrip } from '@/components/shell/DisclaimerStrip';

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

const mockAuthState = vi.hoisted(() => ({ status: 'anonymous' as string }));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, status: mockAuthState.status }),
}));

afterEach(() => {
  mockAuthState.status = 'anonymous';
});

describe('SessionDisclosure (R1)', () => {
  it('explains the transition in calm, plain language', () => {
    render(<SessionDisclosure />);
    expect(screen.getByText('How signing in works')).toBeInTheDocument();
    expect(
      screen.getByText(/new wellbeing activity is saved to your account/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/anything you did anonymously before signing in stays anonymous/i)
    ).toBeInTheDocument();
    // No SaaS/legal jargon.
    expect(screen.queryByText(/workspace|sync|dashboard/i)).not.toBeInTheDocument();
  });

  it('opens the account-session explainer dialog on Learn more', () => {
    render(<SessionDisclosure />);
    expect(screen.queryByText('About your account session')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/learn more about account sessions/i));
    expect(screen.getByText('About your account session')).toBeInTheDocument();
    expect(
      screen.getByText(/logging out returns you to anonymous mode/i)
    ).toBeInTheDocument();
  });
});

describe('SessionModeBadge', () => {
  it('renders the signed-in indicator copy', () => {
    const { container } = render(<SessionModeBadge />);
    expect(container.textContent).toMatch(/signed in/i);
    expect(container.textContent).toMatch(/account session/i);
  });
});

describe('DisclaimerStrip mode copy', () => {
  it('keeps the anonymous wording by default (same structure)', () => {
    const { container } = render(<DisclaimerStrip />);
    expect(screen.getByText(/100% anonymous/i)).toBeInTheDocument();
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('switches to signed-in wording when authenticated without implying anonymity', () => {
    mockAuthState.status = 'authenticated';
    render(<DisclaimerStrip />);
    expect(screen.getByText(/signed in/i)).toBeInTheDocument();
    expect(screen.getByText(/saved to your account/i)).toBeInTheDocument();
    expect(screen.queryByText(/100% anonymous/i)).not.toBeInTheDocument();
  });
});
