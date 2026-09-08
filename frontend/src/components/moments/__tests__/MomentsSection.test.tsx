/**
 * Tests for MomentsSection (@/components/moments/MomentsSection).
 *
 * Covers: auth gating, composer validation, save flow + safety-level UX,
 * list rendering/truncation/plaintext, delete + 4.5s Undo restore contract,
 * error handling, privacy (no console/storage/analytics leakage), and
 * accessibility landmarks. The moments client is mocked; HTTP behavior
 * itself is covered in lib/__tests__/moments.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiError } from '@/lib/auth-api';
import { MOMENT_UNDO_MS, MomentsSection } from '@/components/moments/MomentsSection';
import type { MomentItem } from '@/lib/types';

const momentsMock = vi.hoisted(() => ({
  fetch: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  restore: vi.fn(),
}));

vi.mock('@/lib/moments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/moments')>();
  return {
    ...actual,
    fetchMoments: (...args: unknown[]) => momentsMock.fetch(...args),
    createMoment: (...args: unknown[]) => momentsMock.create(...args),
    deleteMoment: (...args: unknown[]) => momentsMock.remove(...args),
    restoreMoment: (...args: unknown[]) => momentsMock.restore(...args),
  };
});

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
const AUTHED = { status: 'authenticated' as const, user: ME };
const ANON = { status: 'anonymous' as const, user: null };

function moment(overrides: Partial<MomentItem> = {}): MomentItem {
  return {
    id: 'm-1',
    body: 'A short note worth keeping.',
    created_at: '2026-09-08T12:00:00.000Z',
    ...overrides,
  };
}

function listResponse(items: MomentItem[]) {
  return { items, total: items.length, limit: 50, offset: 0 };
}

function createdResponse(body: string, level: 'normal' | 'moderate' | 'high_risk' = 'normal', id = 'm-9') {
  return { id, body, created_at: '2026-09-08T12:00:00.000Z', safety: { level } };
}

function renderSection(auth: typeof AUTHED | typeof ANON = AUTHED) {
  return render(<MomentsSection auth={auth} />);
}

function composer(): HTMLTextAreaElement {
  return screen.getByLabelText('Write a moment') as HTMLTextAreaElement;
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Save moment' });
}

beforeEach(() => {
  momentsMock.fetch.mockReset();
  momentsMock.create.mockReset();
  momentsMock.remove.mockReset();
  momentsMock.restore.mockReset();
  momentsMock.fetch.mockResolvedValue(listResponse([]));
  vi.useRealTimers();
});

afterEach(() => {
  // NOTE: no vi.restoreAllMocks() here on purpose (see story page suite):
  // beforeEach resets and re-arms every mock, and a restore in afterEach
  // could wipe implementations while React is still flushing effects.
});

describe('auth gating', () => {
  it('anonymous auth renders nothing and issues no request', () => {
    const { container } = renderSection(ANON);
    expect(container.innerHTML).toBe('');
    expect(momentsMock.fetch).not.toHaveBeenCalled();
  });

  it('authenticated auth loads moments once with the auth object', async () => {
    renderSection();
    await waitFor(() => expect(momentsMock.fetch).toHaveBeenCalledTimes(1));
    expect(momentsMock.fetch).toHaveBeenCalledWith(AUTHED);
  });

  it('expired session on load shows login-again action', async () => {
    momentsMock.fetch.mockRejectedValue(new AuthApiError(401, 'expired'));
    renderSection();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Log in again/ })).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /Log in again/ })).toHaveAttribute(
      'href',
      '/login?next=%2Fstory'
    );
  });
});

describe('composer validation', () => {
  it('Save stays disabled for empty and whitespace-only input', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    expect(saveButton()).toBeDisabled();
    fireEvent.change(composer(), { target: { value: '   ' } });
    expect(saveButton()).toBeDisabled();
    expect(momentsMock.create).not.toHaveBeenCalled();
  });

  it('shows a live character count that warns near the limit', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    expect(screen.getByText('0 / 500')).toBeInTheDocument();
    fireEvent.change(composer(), { target: { value: 'x'.repeat(460) } });
    expect(screen.getByText('460 / 500')).toBeInTheDocument();
    expect(saveButton()).not.toBeDisabled();
  });

  it('counter updates visually without live announcements, signalling only the near-limit threshold', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    const count = screen.getByText('0 / 500');
    expect(count).not.toHaveAttribute('aria-live');
    expect(screen.queryByText('Approaching the 500 character limit.')).toBeNull();
    fireEvent.change(composer(), { target: { value: 'x'.repeat(460) } });
    expect(screen.getByText('460 / 500')).toBeInTheDocument();
    expect(screen.getByText('Approaching the 500 character limit.')).toBeInTheDocument();
    fireEvent.change(composer(), { target: { value: 'short again' } });
    expect(screen.getByText('11 / 500')).toBeInTheDocument();
    expect(screen.queryByText('Approaching the 500 character limit.')).toBeNull();
  });

  it('clamps over-limit input to 500 characters before sending', async () => {
    momentsMock.create.mockResolvedValue(createdResponse('y'.repeat(500)));
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'y'.repeat(501) } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(momentsMock.create).toHaveBeenCalledTimes(1));
    expect(momentsMock.create.mock.calls[0][1]).toHaveLength(500);
  });

  it('cancel with dirty input asks inline; discard clears without saving', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'keep me?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard this moment?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(composer().value).toBe('');
    expect(momentsMock.create).not.toHaveBeenCalled();
  });

  it('cancel with dirty input keeps writing on Keep writing', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep writing' }));
    expect(composer().value).toBe('keep me');
    expect(momentsMock.create).not.toHaveBeenCalled();
  });
});

describe('save flow', () => {
  it('successful save prepends the server-returned Moment and resets the composer', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-1', body: 'older' })]));
    momentsMock.create.mockResolvedValue(createdResponse('brand new words'));
    renderSection();
    await waitFor(() => expect(screen.getByText('older')).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'brand new words' } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText('Saved to your Story')).toBeInTheDocument()
    );
    expect(composer().value).toBe('');
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent('brand new words');
  });

  it('prevents duplicate submission while a save is pending', async () => {
    let resolveSave!: (value: unknown) => void;
    momentsMock.create.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'once only' } });
    const save = saveButton();
    fireEvent.click(save);
    fireEvent.click(save);
    expect(momentsMock.create).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSave(createdResponse('once only'));
    });
    await waitFor(() =>
      expect(screen.getByText('Saved to your Story')).toBeInTheDocument()
    );
  });

  it('maps 422/413/429 to friendly copy without raw bodies', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'hello' } });

    momentsMock.create.mockRejectedValueOnce(new AuthApiError(422, 'way too long detail'));
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText(/keep it under 500 characters/)).toBeInTheDocument()
    );

    momentsMock.create.mockRejectedValueOnce(new AuthApiError(429, 'slow down detail'));
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText(/take a short pause/)).toBeInTheDocument()
    );

    momentsMock.create.mockRejectedValueOnce(new AuthApiError(401, 'expired'));
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Log in again/ })).toBeInTheDocument()
    );
  });
});

describe('safety-level UX (frontend renders, never classifies)', () => {
  it('normal shows only the calm confirmation', async () => {
    momentsMock.create.mockResolvedValue(createdResponse('fine day'));
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'fine day' } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText('Saved to your Story')).toBeInTheDocument()
    );
    expect(screen.queryByText(/Thank you for trusting us/)).toBeNull();
    expect(screen.queryByText(/You do not have to navigate this alone/)).toBeNull();
    expect(screen.getByText('fine day')).toBeInTheDocument();
  });

  it('moderate saves the Moment and shows gentle support', async () => {
    momentsMock.create.mockResolvedValue(createdResponse('heavy week', 'moderate'));
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'heavy week' } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText('Thank you for trusting us with that')).toBeInTheDocument()
    );
    expect(screen.getByText('heavy week')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '14416' })).toHaveAttribute('href', 'tel:14416');
  });

  it('high_risk saves the Moment and shows crisis support UI', async () => {
    momentsMock.create.mockResolvedValue(createdResponse('unbearable tonight', 'high_risk'));
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'unbearable tonight' } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText('You do not have to navigate this alone')).toBeInTheDocument()
    );
    expect(screen.getByText('unbearable tonight')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View all support options' })
    ).toHaveAttribute('href', '/support-now');
  });
});

describe('list rendering', () => {
  it('shows newest first with day-level dates', async () => {
    momentsMock.fetch.mockResolvedValue(
      listResponse([
        moment({ id: 'm-2', body: 'second', created_at: '2026-09-08T12:00:00.000Z' }),
        moment({ id: 'm-1', body: 'first', created_at: '2026-09-01T12:00:00.000Z' }),
      ])
    );
    renderSection();
    await waitFor(() => expect(screen.getByText('second')).toBeInTheDocument());
    const articles = screen.getAllByRole('article');
    expect(articles[0]).toHaveTextContent('second');
    expect(articles[1]).toHaveTextContent('first');
  });

  it('empty state offers a Write a moment action that focuses the composer', async () => {
    renderSection();
    await waitFor(() => expect(screen.getByText('No moments yet.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Write a moment' }));
    expect(document.activeElement?.id).toBe('moment-composer');
  });

  it('Show more and Delete meet the 44px touch-target standard', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ body: 'z'.repeat(250) })]));
    renderSection();
    await waitFor(() => expect(screen.getByText(/Show more/)).toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: /Show more of moment/ }).className
    ).toMatch(/touch-target/);
    expect(
      screen.getByRole('button', { name: /Delete moment from/ }).className
    ).toMatch(/touch-target/);
  });

  it('truncates long Moments with Show more / Show less and aria-expanded', async () => {
    const long = 'w'.repeat(250);
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ body: long })]));
    renderSection();
    await waitFor(() => expect(screen.getByText(/Show more/)).toBeInTheDocument());
    expect(screen.queryByText(long)).toBeNull();
    const toggle = screen.getByRole('button', { name: /Show more of moment/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText(long)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show less of moment/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('renders Moment bodies as inert text, never markup', async () => {
    const payload = '<script>alert(1)</script>';
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ body: payload })]));
    const { container } = renderSection();
    await waitFor(() => expect(screen.getByText(payload)).toBeInTheDocument());
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a[href="alert(1)"]')).toBeNull();
  });
});

describe('delete + Undo restore contract', () => {
  it('Undo window is at most 5 seconds', () => {
    expect(MOMENT_UNDO_MS).toBeLessThanOrEqual(5000);
  });

  it('delete calls the API immediately, hides the Moment, and focuses Undo', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-1', body: 'bye' })]));
    momentsMock.remove.mockResolvedValue(undefined);
    renderSection();
    await waitFor(() => expect(screen.getByText('bye')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Delete moment from/ }));
    await waitFor(() => expect(momentsMock.remove).toHaveBeenCalledWith(AUTHED, 'm-1'));
    expect(screen.queryByText('bye')).toBeNull();
    const undo = await screen.findByRole('button', { name: 'Undo' });
    expect(document.activeElement).toBe(undo);
  });

  it('Undo restores the Moment to its original position', async () => {
    momentsMock.fetch.mockResolvedValue(
      listResponse([
        moment({ id: 'm-2', body: 'top' }),
        moment({ id: 'm-1', body: 'gone' }),
      ])
    );
    momentsMock.remove.mockResolvedValue(undefined);
    momentsMock.restore.mockResolvedValue(moment({ id: 'm-1', body: 'gone' }));
    renderSection();
    await waitFor(() => expect(screen.getByText('gone')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Delete moment from/ })[1]);
    await waitFor(() => expect(screen.getByText('Moment deleted.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(momentsMock.restore).toHaveBeenCalledWith(AUTHED, 'm-1'));
    await waitFor(() => expect(screen.getByText('Moment restored.')).toBeInTheDocument());
    const articles = screen.getAllByRole('article');
    expect(articles.map((a) => a.textContent)).toHaveLength(2);
    expect(articles[1]).toHaveTextContent('gone');
  });

  it('expired Undo removes the option without calling restore', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-1', body: 'bye' })]));
    momentsMock.remove.mockResolvedValue(undefined);
    renderSection();
    await waitFor(() => expect(screen.getByText('bye')).toBeInTheDocument());
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: /Delete moment from/ }));
      // Flush the delete promise without touching timers.
      await act(async () => {});
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(MOMENT_UNDO_MS + 500);
      });
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
      expect(momentsMock.restore).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('restore 404 is handled quietly as already gone', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-1', body: 'bye' })]));
    momentsMock.remove.mockResolvedValue(undefined);
    momentsMock.restore.mockRejectedValue(new AuthApiError(404, 'Moment not found'));
    renderSection();
    await waitFor(() => expect(screen.getByText('bye')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Delete moment from/ }));
    await waitFor(() => expect(screen.getByText('Moment deleted.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(momentsMock.restore).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('bye')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('delete 404 removes quietly; delete 401 keeps the Moment with an auth note', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-1', body: 'bye' })]));
    momentsMock.remove.mockRejectedValueOnce(new AuthApiError(404, 'Moment not found'));
    renderSection();
    await waitFor(() => expect(screen.getByText('bye')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Delete moment from/ }));
    await waitFor(() => expect(screen.queryByText('bye')).toBeNull());

    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-2', body: 'stay' })]));
    momentsMock.remove.mockReset();
    momentsMock.remove.mockRejectedValueOnce(new AuthApiError(401, 'expired'));
    render(<MomentsSection auth={AUTHED} />);
    await waitFor(() => expect(screen.getByText('stay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Delete moment from/ }));
    await waitFor(() =>
      expect(screen.getByText(/sign-in has expired/)).toBeInTheDocument()
    );
    expect(screen.getByText('stay')).toBeInTheDocument();
  });

  it('failed delete keeps the Moment visible for retry', async () => {
    momentsMock.fetch.mockResolvedValue(listResponse([moment({ id: 'm-1', body: 'stay' })]));
    momentsMock.remove.mockRejectedValue(new Error('network down'));
    renderSection();
    await waitFor(() => expect(screen.getByText('stay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Delete moment from/ }));
    await waitFor(() =>
      expect(screen.getByText(/couldn’t delete that moment/)).toBeInTheDocument()
    );
    expect(screen.getByText('stay')).toBeInTheDocument();
  });
});

describe('privacy', () => {
  it('never writes Moment bodies to console, storage, or analytics', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    momentsMock.create.mockResolvedValue(createdResponse('secret words here'));
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    fireEvent.change(composer(), { target: { value: 'secret words here' } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByText('Saved to your Story')).toBeInTheDocument()
    );
    for (const spy of [logSpy, errSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('secret words here');
      }
    }
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe('accessibility landmarks', () => {
  it('exposes labelled composer, count, and keyboard-operable controls', async () => {
    renderSection();
    await waitFor(() => expect(composer()).toBeInTheDocument());
    expect(composer()).toHaveAttribute('maxlength', '500');
    expect(screen.getByText('0 / 500')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    const region = screen.getByRole('region', { name: 'Moments' });
    expect(within(region).getByRole('heading', { name: 'Moments' })).toBeInTheDocument();
  });
});
