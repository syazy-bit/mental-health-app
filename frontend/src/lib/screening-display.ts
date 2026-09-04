/**
 * Shared screening-result display helpers (Phase 3C).
 *
 * Extracted verbatim from the anonymous screening result page so the
 * "My Check-ins" history reuses the exact same severity language, badge
 * mapping, and spectrum bands — no duplicate vocabulary, no visual drift.
 * The result page imports from here; its rendering is unchanged.
 */

export type SeverityBadgeVariant = 'brand' | 'sage' | 'amber' | 'coral' | 'neutral';

export function getSeverityBadgeVariant(sev: string): SeverityBadgeVariant {
  const lower = sev.toLowerCase();
  if (lower.includes('minimal')) return 'sage';
  if (lower.includes('mild')) return 'sage';
  if (lower.includes('moderately severe') || lower.includes('severe')) return 'coral';
  if (lower.includes('moderate')) return 'amber';
  return 'neutral';
}

export function getSeverityDescription(severity: string): string {
  const sev = severity.toLowerCase();
  if (sev.includes('minimal')) {
    return 'Your responses reflect minimal to no significant symptoms over the past 2 weeks. Continuing everyday healthy habits (consistent sleep, movement, and study breaks) helps maintain baseline wellness.';
  }
  if (sev.includes('mild')) {
    return 'Your responses suggest mild symptoms. While these may not severely interfere with your daily routine, engaging in proactive self-care, mindfulness, and talking through thoughts with supportive friends or our listening assistant can be very helpful.';
  }
  if (sev.includes('moderately severe') || sev.includes('severe')) {
    return 'Your responses indicate significant symptom intensity that may be heavily impacting academic focus, sleep, or daily routines. We strongly recommend scheduling a conversation with a campus counselor or healthcare provider.';
  }
  // Moderate
  return 'Your responses reflect moderate symptom levels. Consider exploring structured stress-reduction techniques, speaking with a university counselor, or discussing your feelings with someone you trust.';
}

// Determine active spectrum tier (0: Minimal, 1: Mild, 2: Moderate, 3: Severe)
export function getSpectrumTier(sev: string): number {
  const lower = sev.toLowerCase();
  if (lower.includes('minimal')) return 0;
  if (lower.includes('mild')) return 1;
  if (lower.includes('moderately severe') || lower.includes('severe')) return 3;
  return 2; // Moderate
}

export interface SpectrumBand {
  label: string;
  range: string;
}

export function spectrumBandsFor(isPHQ9: boolean): SpectrumBand[] {
  return isPHQ9
    ? [
        { label: 'Minimal', range: '0–4' },
        { label: 'Mild', range: '5–9' },
        { label: 'Moderate', range: '10–14' },
        { label: 'Significant', range: '15–27' },
      ]
    : [
        { label: 'Minimal', range: '0–4' },
        { label: 'Mild', range: '5–9' },
        { label: 'Moderate', range: '10–14' },
        { label: 'Significant', range: '15–21' },
      ];
}

/**
 * Short calendar date for a history entry (e.g. "Sep 1, 2026").
 * Time is intentionally omitted: entries are day-level check-ins.
 */
export function formatCheckinDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
