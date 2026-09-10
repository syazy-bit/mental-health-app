/**
 * Tests for What Helped integration on the Tools page.
 *
 * Covers: each of the four production tools exposes a "This helped"
 * action; the ?tool= deep link arrives via the Next.js searchParams prop
 * (unwrapped with React use(), never window.location, so server and
 * client render the same initial tab/card tree); unknown values fall back
 * to the default tab; targeting scrolls, highlights, and focuses once.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourcesPage from '@/app/(student)/resources/page';

const authState = vi.hoisted(() => ({
  value: { status: 'anonymous' as string, user: null as unknown } as {
    status: string;
    user: { id: string; email: string; display_name: null; created_at: string } | null;
  },
}));

const pushedPaths: string[] = [];

const marksMock = vi.hoisted(() => ({
  mark: vi.fn(),
}));

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

vi.mock('@/lib/helpful_marks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/helpful_marks')>();
  return {
    ...actual,
    markHelpful: (...args: unknown[]) => marksMock.mark(...args),
  };
});

type SearchParams = { [key: string]: string | string[] | undefined };

// The page unwraps a searchParams promise with React use(), which suspends
// for a tick even when already resolved. Render inside Suspense and flush
// microtasks so assertions see the settled tree. Microtask-only flush:
// safe under both real and fake timers.
async function renderPage(params: SearchParams = {}) {
  // The page unwraps searchParams with React use(), which suspends for a
  // tick even when already resolved. Await act() around render so the
  // promise settles and the committed tree is the resolved one.
  // Microtask-only flush: safe under both real and fake timers.
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <Suspense fallback={<div>Loading tools…</div>}>
        <ResourcesPage searchParams={Promise.resolve(params)} />
      </Suspense>
    );
  });
  return view;
}

beforeEach(() => {
  authState.value = { status: 'anonymous', user: null };
  pushedPaths.length = 0;
  marksMock.mark.mockReset();
  marksMock.mark.mockResolvedValue({
    tool_id: 'box_breathing',
    marked_at: '2026-09-09T12:00:00.000Z',
  });
  window.history.pushState({}, '', '/resources');
});

describe('This helped actions', () => {
  it('default tab exposes the Box Breathing mark action', async () => {
    await renderPage();
    expect(
      screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' })
    ).toBeInTheDocument();
  });

  it('each tool tab exposes its own mark action', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Ground myself' }));
    expect(
      screen.getByRole('button', { name: 'Mark 5-4-3-2-1 Sensory Grounding as helpful' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Focus & study reset' }));
    expect(
      screen.getByRole('button', { name: 'Mark Study Pause & Deliberate Rest as helpful' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Explore my surroundings' }));
    expect(
      screen.getByRole('button', { name: 'Mark Grounding Hunt as helpful' })
    ).toBeInTheDocument();
  });

  it('anonymous mark attempts route to sign-in without a network request', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Box Breathing Exercise as helpful' }));
    await waitFor(() => expect(pushedPaths).toEqual(['/login?next=/resources']));
    expect(marksMock.mark).not.toHaveBeenCalled();
  });
});

describe('?tool= deep links', () => {
  it('opens the tab hosting the requested tool', async () => {
    await renderPage({ tool: 'study_reset' });
    expect(screen.getByText('Study Pause & Deliberate Rest')).toBeInTheDocument();
  });

  it('falls back to the default tab for unknown values', async () => {
    await renderPage({ tool: 'nap_time' });
    expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument();
  });

  it('uses the first entry when the parameter repeats', async () => {
    await renderPage({ tool: ['grounding_hunt', 'study_reset'] });
    expect(screen.getByText('Grounding Hunt')).toBeInTheDocument();
  });
});

describe('hydration-safe initial state', () => {
  it('derives the initial tab from searchParams, not window.location', async () => {
    // Browser URL says one tool, Next.js searchParams say another: the
    // prop must win, proving the initial render never reads window.
    window.history.pushState({}, '', '/resources?tool=study_reset');
    await renderPage({});
    expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument();
    expect(screen.queryByText('Study Pause & Deliberate Rest')).toBeNull();
  });

  it('renders the requested tab on first paint with no transition', async () => {
    window.history.pushState({}, '', '/resources');
    await renderPage({ tool: 'study_reset' });
    // Correct tab selected and correct card present immediately.
    expect(screen.getByRole('tab', { name: 'Focus & study reset' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Study Pause & Deliberate Rest')).toBeInTheDocument();
    expect(screen.queryByText('Box Breathing Exercise')).toBeNull();
  });
});

describe('?tool= targeting', () => {
  let scrollSpy: ReturnType<typeof vi.fn>;
  const realScroll = Element.prototype.scrollIntoView;
  const realMatchMedia = window.matchMedia;

  beforeEach(() => {
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = realScroll;
    window.matchMedia = realMatchMedia;
    vi.useRealTimers();
  });

  it('brings a valid deep-linked tool into view and focuses it', async () => {
    await renderPage({ tool: 'study_reset' });
    // Correct tab opened for the requested tool.
    expect(screen.getByText('Study Pause & Deliberate Rest')).toBeInTheDocument();
    const card = document.getElementById('tool-study_reset');
    expect(card).not.toBeNull();
    // Exact tool scrolled into view (smooth by default) and focused
    // without re-scrolling, with a temporary highlight applied.
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(document.activeElement).toBe(card);
    expect((card as HTMLElement).style.boxShadow).not.toBe('');
  });

  it('uses instant scrolling when reduced motion is preferred', async () => {
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    await renderPage({ tool: 'grounding_hunt' });
    expect(screen.getByText('Grounding Hunt')).toBeInTheDocument();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(document.activeElement).toBe(document.getElementById('tool-grounding_hunt'));
  });

  it('clears the highlight after a short delay', async () => {
    // Fake timers must be active before render so the effect's timeout
    // is created on the fake clock.
    vi.useFakeTimers();
    await renderPage({ tool: 'study_reset' });
    const card = document.getElementById('tool-study_reset') as HTMLElement;
    expect(card.style.boxShadow).not.toBe('');
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(card.style.boxShadow).toBe('');
    // Focus was already moved; only the visual highlight is temporary.
    expect(document.activeElement).toBe(card);
  });

  it('does nothing without ?tool', async () => {
    await renderPage();
    expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(
      (document.getElementById('tool-box_breathing') as HTMLElement).style.boxShadow
    ).toBe('');
  });

  it('does nothing for unknown tool ids without throwing', async () => {
    await renderPage({ tool: 'nap_time' });
    expect(screen.getByText('Box Breathing Exercise')).toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(
      (document.getElementById('tool-box_breathing') as HTMLElement).style.boxShadow
    ).toBe('');
  });
});

describe('self-check section (anonymous assessment discovery)', () => {
  it('renders for anonymous users with PHQ-9, GAD-7, and about links', async () => {
    await renderPage();
    expect(
      screen.getByRole('heading', { name: 'Check in with yourself' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /PHQ-9.*Mood check-in/ })
    ).toHaveAttribute('href', '/screening/phq9');
    expect(
      screen.getByRole('link', { name: /GAD-7.*Anxiety check-in/ })
    ).toHaveAttribute('href', '/screening/gad7');
    expect(
      screen.getByRole('link', { name: /About these check-ins/ })
    ).toHaveAttribute('href', '/screening');
  });

  it('renders identically for authenticated users with no account content', async () => {
    authState.value = {
      status: 'authenticated',
      user: { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' },
    };
    await renderPage();
    expect(
      screen.getByRole('heading', { name: 'Check in with yourself' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /PHQ-9.*Mood check-in/ })
    ).toHaveAttribute('href', '/screening/phq9');
    // No history, scores, severity, or login gates inside the section.
    const section = screen
      .getByRole('heading', { name: 'Check in with yourself' })
      .closest('section');
    expect(section).not.toBeNull();
    expect(section!.textContent).not.toMatch(/Minimal|Mild|Moderate|Severe|score|Log in/i);
  });

  it('states the anonymous privacy guarantee without overclaiming', async () => {
    await renderPage();
    expect(
      screen.getByText(/aren’t linked to an account/i)
    ).toBeInTheDocument();
  });
});
