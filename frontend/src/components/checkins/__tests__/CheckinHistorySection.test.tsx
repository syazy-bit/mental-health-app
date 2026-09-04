/**
 * Tests for the Phase 3C history section + trend (@/components/checkins).
 *
 * Covers: PHQ-9/GAD-7 rendering, trend minimum rules, neutral language
 * (never better/worse), Item-9 raw score suppression with supportive
 * framing, retake navigation, empty state, and responsive classes.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CheckinHistorySection } from '@/components/checkins/CheckinHistorySection';
import type { ScreeningHistoryItem } from '@/lib/types';

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

afterEach(() => {
  vi.restoreAllMocks();
});

function expandOnlyEntry(container: HTMLElement) {
  // A lone entry starts expanded ("1 result → show only the result").
  const button = container.querySelector(
    'button[aria-expanded="false"]'
  ) as HTMLButtonElement | null;
  if (button) {
    fireEvent.click(button);
  }
}

function item(overrides: Partial<ScreeningHistoryItem> = {}): ScreeningHistoryItem {
  return {
    id: 'h-1',
    instrument: 'PHQ9',
    total_score: 12,
    severity: 'Moderate',
    safety_flag: false,
    item9_score: 0,
    created_at: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

// Directional-judgment language that must never appear in history UX.
const BANNED = /better|worse|improv|declin|deterior|recover/i;

describe('instrument rendering', () => {
  it('renders PHQ-9 entries with score, severity, and date', () => {
    const { container } = render(
      <CheckinHistorySection
        instrument="PHQ9"
        items={[item({ id: 'h-1', total_score: 12, severity: 'Moderate' })]}
      />
    );
    expect(screen.getByRole('heading', { name: 'PHQ-9 history' })).toBeInTheDocument();
    // Severity badge + active spectrum band share the severity label.
    expect(screen.getAllByText('Moderate')).toHaveLength(2);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(container.textContent).toMatch(/Sep 1, 2026/);
  });

  it('renders GAD-7 entries with the /21 scale and GAD-7 retake link', () => {
    render(
      <CheckinHistorySection
        instrument="GAD7"
        items={[
          item({ id: 'g-1', instrument: 'GAD7', total_score: 7, severity: 'Mild' }),
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'GAD-7 history' })).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/ 21')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retake GAD-7/ })).toHaveAttribute(
      'href',
      '/screening/gad7'
    );
  });

  it('never exposes session_id, raw answers, or internal records', () => {
    const { container } = render(
      <CheckinHistorySection instrument="PHQ9" items={[item({ id: 'h-9' })]} />
    );
    const text = (container.textContent ?? '').toLowerCase();
    expect(text).not.toContain('session_id');
    expect(text).not.toContain('session id');
    expect(text).not.toContain('h-9');
  });
});

describe('trend minimum rules', () => {
  it('1 result: shows only the result, no trend or comparison', () => {
    const { container } = render(
      <CheckinHistorySection instrument="PHQ9" items={[item()]} />
    );
    expect(container.textContent).not.toMatch(/over time|most recent|side by side/i);
    expect(container.textContent).not.toMatch(BANNED);
  });

  it('2 results: factual comparison only, no better/worse language', () => {
    const { container } = render(
      <CheckinHistorySection
        instrument="PHQ9"
        items={[
          item({ id: 'h-2', total_score: 12, created_at: '2026-09-10T12:00:00.000Z' }),
          item({ id: 'h-1', total_score: 8, created_at: '2026-08-20T12:00:00.000Z' }),
        ]}
      />
    );
    expect(screen.getByText(/Your two most recent PHQ-9 check-ins/)).toBeInTheDocument();
    expect(container.textContent).toMatch(/Latest:/);
    expect(container.textContent).toMatch(/Previous:/);
    expect(container.textContent).not.toMatch(/over time/i);
    expect(container.textContent).not.toMatch(BANNED);
  });

  it('3+ results: neutral trajectory visualization, no directional judgment', () => {
    const { container } = render(
      <CheckinHistorySection
        instrument="GAD7"
        items={[
          item({ id: 'g-3', instrument: 'GAD7', total_score: 9, created_at: '2026-09-10T12:00:00.000Z' }),
          item({ id: 'g-2', instrument: 'GAD7', total_score: 6, created_at: '2026-08-20T12:00:00.000Z' }),
          item({ id: 'g-1', instrument: 'GAD7', total_score: 12, created_at: '2026-07-15T12:00:00.000Z' }),
        ]}
      />
    );
    expect(
      screen.getByText('Your GAD-7 check-in scores over time')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[role="img"][aria-label*="scores over time"]')
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(BANNED);
  });

  it('3+ trend rows are hidden from assistive tech; the img summary keeps all meaning', () => {
    const { container } = render(
      <CheckinHistorySection
        instrument="GAD7"
        items={[
          item({ id: 'g-3', instrument: 'GAD7', total_score: 9, created_at: '2026-09-10T12:00:00.000Z' }),
          item({ id: 'g-2', instrument: 'GAD7', total_score: 6, created_at: '2026-08-20T12:00:00.000Z' }),
          item({ id: 'g-1', instrument: 'GAD7', total_score: 12, created_at: '2026-07-15T12:00:00.000Z' }),
        ]}
      />
    );
    const summary = container.querySelector(
      '[role="img"][aria-label*="scores over time"]'
    ) as HTMLElement;
    expect(summary).toBeInTheDocument();
    // The summary alone carries every date/score (nothing meaningful removed).
    expect(summary.getAttribute('aria-label')).toMatch(/9 on /);
    expect(summary.getAttribute('aria-label')).toMatch(/6 on /);
    expect(summary.getAttribute('aria-label')).toMatch(/12 on /);
    // Each visual row is presentational-only: hidden, with no focusable content.
    const rows = summary.querySelectorAll(':scope > div[aria-hidden="true"]');
    expect(rows.length).toBe(3);
    expect(summary.querySelector('a, button, input, [tabindex]')).toBeNull();
  });
});

describe('Item-9 safety handling', () => {
  const flagged = item({
    id: 'h-flag',
    total_score: 16,
    severity: 'Moderately severe',
    safety_flag: true,
    item9_score: 3,
  });

  it('does NOT display the raw Item-9 number', () => {
    const { container } = render(
      <CheckinHistorySection instrument="PHQ9" items={[flagged]} />
    );
    expandOnlyEntry(container);
    // total_score (16) is shown; the item9 value (3) must not appear standalone,
    // and no "Item 9" label may exist anywhere.
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.queryByText('3', { exact: true })).toBeNull();
    expect(container.textContent).not.toMatch(/item.?9/i);
  });

  it('gives flagged historical screenings supportive framing + support access', () => {
    const { container } = render(
      <CheckinHistorySection instrument="PHQ9" items={[flagged]} />
    );
    expandOnlyEntry(container);
    expect(
      screen.getByText(/You noted difficult thoughts at the time/)
    ).toBeInTheDocument();
    expect(screen.getByText('Support is available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '14416' })).toHaveAttribute('href', 'tel:14416');
    expect(
      screen.getByRole('link', { name: 'View all support options' })
    ).toHaveAttribute('href', '/support-now');
  });

  it('shows no safety framing for non-flagged entries', () => {
    const { container } = render(
      <CheckinHistorySection
        instrument="PHQ9"
        items={[item({ safety_flag: false, item9_score: 0 })]}
      />
    );
    expandOnlyEntry(container);
    expect(screen.queryByText(/You noted difficult thoughts/)).toBeNull();
    expect(screen.queryByText('Support is available')).toBeNull();
  });
});

describe('empty + retake + responsive', () => {
  it('empty instrument shows a calm note with a retake CTA', () => {
    render(<CheckinHistorySection instrument="PHQ9" items={[]} />);
    expect(screen.getByText(/No PHQ-9 check-ins yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Take PHQ-9/ })).toHaveAttribute(
      'href',
      '/screening/phq9'
    );
  });

  it('populated section links to the correct retake route', () => {
    render(<CheckinHistorySection instrument="PHQ9" items={[item()]} />);
    expect(screen.getByRole('link', { name: /Retake PHQ-9/ })).toHaveAttribute(
      'href',
      '/screening/phq9'
    );
  });

  it('entry rows and CTAs reuse the responsive flex/grid system', () => {
    const { container } = render(
      <CheckinHistorySection instrument="PHQ9" items={[item()]} />
    );
    // Retake row stacks on mobile, sits side-by-side from sm up.
    expect(container.querySelector('[class*="sm:flex-row"]')).toBeInTheDocument();
    // Spectrum detail reuses the responsive 4-column grid.
    expandOnlyEntry(container);
    expect(container.querySelector('[class*="grid-cols-4"]')).toBeInTheDocument();
  });
});
