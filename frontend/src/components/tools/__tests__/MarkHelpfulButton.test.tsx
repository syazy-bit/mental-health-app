/**
 * Tests for MarkHelpfulButton (@/components/tools/MarkHelpfulButton).
 *
 * Covers: unmarked initial state, successful mark → temporary checked
 * state, failed mark stays unmarked, double-click guard, anonymous users
 * routed to sign-in without any network request, 401 → sign-in, and that
 * the button remounts unmarked (temporary interaction state).
 * The helpful-marks client is mocked; HTTP behavior itself is covered in
 * lib/__tests__/helpful_marks.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiError } from '@/lib/auth-api';
import { MarkHelpfulButton } from '@/components/tools/MarkHelpfulButton';

const marksMock = vi.hoisted(() => ({
  mark: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown } as {
    status: string;
    user: { id: string; email: string; display_name: null; created_at: string } | null;
  },
}));

const pushedPaths: string[] = [];

vi.mock('@/lib/helpful_marks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/helpful_marks')>();
  return {
    ...actual,
    markHelpful: (...args: unknown[]) => marksMock.mark(...args),
  };
});

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => authState.value,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (path: string) => {
      pushedPaths.push(path);
    },
    replace: vi.fn(),
  }),
}));

const ME = { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' };

function authed() {
  authState.value = { status: 'authenticated', user: ME };
}

function renderButton() {
  return render(<MarkHelpfulButton toolId="box_breathing" toolName="Box Breathing Exercise" />);
}

beforeEach(() => {
  authState.value = { status: 'anonymous', user: null };
  pushedPaths.length = 0;
  marksMock.mark.mockReset();
  marksMock.mark.mockResolvedValue({ tool_id: 'box_breathing', marked_at: '2026-09-09T12:00:00.000Z' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('unmarked state', () => {
  it('renders "This helped" initially with no rating affordances', () => {
    authed();
    renderButton();
    const button = screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/stars|rating|helpful\?$/i)).toBeNull();
  });
});

describe('successful mark', () => {
  it('shows the temporary checked state after POST succeeds', async () => {
    authed();
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    await waitFor(() => expect(marksMock.mark).toHaveBeenCalledTimes(1));
    expect(marksMock.mark).toHaveBeenCalledWith(
      { status: 'authenticated', user: ME },
      'box_breathing'
    );
    await waitFor(() =>
      expect(screen.getByText('You marked this as helpful')).toBeInTheDocument()
    );
  });

  it('prevents duplicate submission while a mark is pending', async () => {
    let resolveMark!: (value: unknown) => void;
    marksMock.mark.mockReturnValue(
      new Promise((resolve) => {
        resolveMark = resolve;
      })
    );
    authed();
    renderButton();
    const button = screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(marksMock.mark).toHaveBeenCalledTimes(1);
    await Promise.resolve().then(() => {
      resolveMark({ tool_id: 'box_breathing', marked_at: '2026-09-09T12:00:00.000Z' });
    });
    await waitFor(() =>
      expect(screen.getByText('You marked this as helpful')).toBeInTheDocument()
    );
  });
});

describe('failed mark', () => {
  it('stays unmarked and shows calm copy on network failure', async () => {
    authed();
    marksMock.mark.mockRejectedValue(new Error('network down'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    await waitFor(() =>
      expect(screen.getByText(/couldn’t save that/)).toBeInTheDocument()
    );
    expect(screen.queryByText('You marked this as helpful')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' })
    ).toBeInTheDocument();
  });
});

describe('anonymous behavior', () => {
  it('routes to sign-in without issuing any network request', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    expect(pushedPaths).toEqual(['/login?next=/resources']);
    expect(marksMock.mark).not.toHaveBeenCalled();
    expect(screen.queryByText('You marked this as helpful')).toBeNull();
  });

  it('expired session routes to sign-in without showing checked state', async () => {
    authed();
    marksMock.mark.mockRejectedValue(new AuthApiError(401, 'expired'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    await waitFor(() => expect(pushedPaths).toEqual(['/login?next=/resources']));
    expect(screen.queryByText('You marked this as helpful')).toBeNull();
  });
});

describe('temporary interaction state', () => {
  it('remounts unmarked (checked state does not persist across visits)', async () => {
    authed();
    const first = renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    await waitFor(() =>
      expect(screen.getByText('You marked this as helpful')).toBeInTheDocument()
    );
    first.unmount();
    renderButton();
    expect(
      screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' })
    ).toBeInTheDocument();
    expect(screen.queryByText('You marked this as helpful')).toBeNull();
  });
});

describe('privacy', () => {
  it('never writes mark data to storage or console', async () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authed();
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    await waitFor(() =>
      expect(screen.getByText('You marked this as helpful')).toBeInTheDocument()
    );
    for (const spy of [logSpy, errSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('box_breathing');
      }
    }
    expect(setSpy).not.toHaveBeenCalled();
  });
});
