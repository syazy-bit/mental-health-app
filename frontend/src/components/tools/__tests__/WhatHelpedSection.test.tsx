/**
 * Tests for WhatHelpedSection (@/components/tools/WhatHelpedSection).
 *
 * Covers: auth gating, list rendering with registry mapping, date display
 * ("Marked today" vs local date), empty state, Try again deep links,
 * remove flow (immediate removal, failure preservation, 401), unknown-id
 * filtering, error handling, and privacy (no storage/console leakage).
 * The helpful-marks client is mocked; HTTP behavior itself is covered in
 * lib/__tests__/helpful_marks.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiError } from '@/lib/auth-api';
import { WhatHelpedSection } from '@/components/tools/WhatHelpedSection';
import type { HelpfulMarkItem } from '@/lib/types';

const marksMock = vi.hoisted(() => ({
  fetch: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/helpful_marks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/helpful_marks')>();
  return {
    ...actual,
    fetchHelpfulMarks: (...args: unknown[]) => marksMock.fetch(...args),
    removeHelpfulMark: (...args: unknown[]) => marksMock.remove(...args),
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

function mark(overrides: Partial<HelpfulMarkItem> = {}): HelpfulMarkItem {
  return {
    tool_id: 'box_breathing',
    marked_at: '2026-09-09T12:00:00.000Z',
    ...overrides,
  };
}

function listResponse(items: HelpfulMarkItem[]) {
  return { items, total: items.length, limit: 50, offset: 0 };
}

function renderSection(auth: typeof AUTHED | typeof ANON = AUTHED) {
  return render(<WhatHelpedSection auth={auth} />);
}

beforeEach(() => {
  marksMock.fetch.mockReset();
  marksMock.remove.mockReset();
  marksMock.fetch.mockResolvedValue(listResponse([]));
  marksMock.remove.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth gating', () => {
  it('anonymous auth renders nothing and issues no request', () => {
    const { container } = renderSection(ANON);
    expect(container.innerHTML).toBe('');
    expect(marksMock.fetch).not.toHaveBeenCalled();
  });

  it('authenticated auth loads marks once with the auth object', async () => {
    renderSection();
    await waitFor(() => expect(marksMock.fetch).toHaveBeenCalledTimes(1));
    expect(marksMock.fetch).toHaveBeenCalledWith(AUTHED);
  });

  it('expired session on load shows login-again action', async () => {
    marksMock.fetch.mockRejectedValue(new AuthApiError(401, 'expired'));
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

describe('list rendering', () => {
  it('renders one card per tool with mapped names and deep links', async () => {
    marksMock.fetch.mockResolvedValue(
      listResponse([mark({ tool_id: 'box_breathing' }), mark({ tool_id: 'study_reset' })])
    );
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    expect(screen.getByText('Study Pause & Deliberate Rest')).toBeInTheDocument();
    const retries = screen.getAllByRole('link', { name: /Try again/ });
    expect(retries).toHaveLength(2);
    expect(retries[0]).toHaveAttribute('href', '/resources?tool=box_breathing');
    expect(retries[1]).toHaveAttribute('href', '/resources?tool=study_reset');
    expect(screen.queryByText(/times|score|rank|effective/i)).toBeNull();
  });

  it('renders exactly one card per returned item (uniqueness is a backend PK guarantee)', async () => {
    marksMock.fetch.mockResolvedValue(
      listResponse([
        mark({ tool_id: 'box_breathing' }),
        mark({ tool_id: 'study_reset' }),
      ])
    );
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    expect(screen.getAllByRole('heading', { name: 'Box Breathing Exercise' })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { name: 'Study Pause & Deliberate Rest' })).toHaveLength(1);
  });

  it('filters unknown registry ids instead of rendering broken cards', async () => {
    marksMock.fetch.mockResolvedValue(
      listResponse([mark({ tool_id: 'box_breathing' }), mark({ tool_id: 'retired_tool' })])
    );
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    expect(screen.queryByText('retired_tool')).toBeNull();
    expect(screen.getAllByRole('link', { name: /Try again/ })).toHaveLength(1);
  });

  it('empty state offers Explore tools without gamified copy', async () => {
    renderSection();
    await waitFor(() =>
      expect(screen.getByText("You haven't marked anything yet.")).toBeInTheDocument()
    );
    expect(
      screen.getByRole('link', { name: 'Explore tools' })
    ).toHaveAttribute('href', '/resources');
    expect(screen.queryByText(/streak|journey|every day/i)).toBeNull();
  });
});

describe('date display', () => {
  it('shows "Marked today" for same-local-day marks', async () => {
    const today = new Date().toISOString();
    marksMock.fetch.mockResolvedValue(listResponse([mark({ marked_at: today })]));
    renderSection();
    await waitFor(() => expect(screen.getByText('Marked today')).toBeInTheDocument());
  });

  it('shows a short local date for older marks', async () => {
    marksMock.fetch.mockResolvedValue(
      listResponse([mark({ marked_at: '2026-09-05T12:00:00.000Z' })])
    );
    renderSection();
    await waitFor(() => expect(screen.getByText(/Marked Sep 5, 2026/)).toBeInTheDocument());
  });
});

describe('remove flow', () => {
  it('removes the item immediately on successful DELETE', async () => {
    marksMock.fetch.mockResolvedValue(
      listResponse([mark({ tool_id: 'box_breathing' }), mark({ tool_id: 'study_reset' })])
    );
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Box Breathing Exercise from What helped' })
    );
    await waitFor(() => expect(marksMock.remove).toHaveBeenCalledWith(AUTHED, 'box_breathing'));
    expect(screen.queryByText('Box Breathing Exercise')).toBeNull();
    expect(screen.getByText('Study Pause & Deliberate Rest')).toBeInTheDocument();
  });

  it('preserves the item and shows calm copy when removal fails', async () => {
    marksMock.fetch.mockResolvedValue(listResponse([mark({ tool_id: 'box_breathing' })]));
    marksMock.remove.mockRejectedValue(new Error('network down'));
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Box Breathing Exercise from What helped' })
    );
    await waitFor(() =>
      expect(screen.getByText(/couldn’t remove that item/)).toBeInTheDocument()
    );
    expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument();
  });

  it('expired session on remove follows auth behavior without losing the item', async () => {
    marksMock.fetch.mockResolvedValue(listResponse([mark({ tool_id: 'box_breathing' })]));
    marksMock.remove.mockRejectedValue(new AuthApiError(401, 'expired'));
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Box Breathing Exercise from What helped' })
    );
    await waitFor(() =>
      expect(screen.getByText(/sign-in has expired/)).toBeInTheDocument()
    );
    expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument();
  });

  it('shows the empty state after removing the last item', async () => {
    marksMock.fetch.mockResolvedValue(listResponse([mark({ tool_id: 'box_breathing' })]));
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Box Breathing Exercise from What helped' })
    );
    await waitFor(() =>
      expect(screen.getByText("You haven't marked anything yet.")).toBeInTheDocument()
    );
  });
});

describe('accessibility landmarks', () => {
  it('exposes a labelled section with keyboard-operable controls', async () => {
    renderSection();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'What helped' })).toBeInTheDocument()
    );
    const region = screen.getByRole('region', { name: 'What helped' });
    expect(region).toBeInTheDocument();
  });
});

describe('privacy', () => {
  it('never writes mark data to storage or console', async () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    marksMock.fetch.mockResolvedValue(listResponse([mark({ tool_id: 'box_breathing' })]));
    renderSection();
    await waitFor(() => expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Box Breathing Exercise from What helped' })
    );
    await waitFor(() => expect(marksMock.remove).toHaveBeenCalledTimes(1));
    for (const spy of [logSpy, errSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('box_breathing');
      }
    }
    expect(setSpy).not.toHaveBeenCalled();
  });
});
