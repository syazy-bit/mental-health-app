'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { ScreeningHistoryItem } from '@/lib/types';
import {
  formatCheckinDate,
  getSeverityBadgeVariant,
  getSeverityDescription,
  getSpectrumTier,
  spectrumBandsFor,
} from '@/lib/screening-display';
import { CheckinTrend } from '@/components/checkins/CheckinTrend';

export interface CheckinHistorySectionProps {
  instrument: 'PHQ9' | 'GAD7';
  /** History items for this instrument, newest first (API order). */
  items: ScreeningHistoryItem[];
}

const INSTRUMENT_COPY: Record<
  CheckinHistorySectionProps['instrument'],
  {
    label: string;
    heading: string;
    eyebrow: string;
    description: string;
    accentClass: string;
    retakeHref: string;
    retakeLabel: string;
    retakeVariant: 'brand' | 'secondary';
    maxScore: number;
  }
> = {
  PHQ9: {
    label: 'PHQ-9',
    heading: 'PHQ-9 history',
    eyebrow: 'Mood & Energy History',
    description: 'Your past mood and energy check-ins, newest first.',
    accentClass: 'border-t-3 border-t-[#0D5C56] dark:border-t-[#4FA79D]',
    retakeHref: '/screening/phq9',
    retakeLabel: 'Retake PHQ-9',
    retakeVariant: 'brand',
    maxScore: 27,
  },
  GAD7: {
    label: 'GAD-7',
    heading: 'GAD-7 history',
    eyebrow: 'Anxiety & Tension History',
    description: 'Your past anxiety and tension check-ins, newest first.',
    accentClass: 'border-t-3 border-t-[#4A6B62] dark:border-t-[#86A69D]',
    retakeHref: '/screening/gad7',
    retakeLabel: 'Retake GAD-7',
    retakeVariant: 'secondary',
    maxScore: 21,
  },
};

/**
 * One instrument's history section.
 *
 * Reuses the screening-hub card accents, the result page's score pill,
 * severity badges, spectrum bands, plain-language descriptions, and the
 * existing crisis Alert for historically flagged check-ins. The raw
 * Item-9 answer is never rendered — flagged entries only get supportive
 * framing plus the existing support/helpline access.
 */
export const CheckinHistorySection: React.FC<CheckinHistorySectionProps> = ({
  instrument,
  items,
}) => {
  const copy = INSTRUMENT_COPY[instrument];
  const [expandedId, setExpandedId] = useState<string | null>(
    items.length === 1 ? items[0].id : null
  );
  const headingId = `${instrument.toLowerCase()}-history-heading`;
  const bands = spectrumBandsFor(instrument === 'PHQ9');

  return (
    <section aria-labelledby={headingId}>
      <Card variant="elevated" padding="lg" className={`space-y-5 ${copy.accentClass}`}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-400 dark:text-[#73827D] uppercase tracking-wider">
              {copy.eyebrow}
            </span>
            <Badge variant="neutral" size="sm">
              {items.length} check-in{items.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <h2
            id={headingId}
            className="text-xl font-bold text-[#19232D] dark:text-[#F1F3EF]"
          >
            {copy.heading}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
            {copy.description}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
              No {copy.label} check-ins yet. Your completed {copy.label} check-ins will appear
              here.
            </p>
            <Link href={copy.retakeHref} className="shrink-0">
              <Button variant={copy.retakeVariant} size="sm">
                <span>Take {copy.label}</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <CheckinTrend instrument={instrument} items={items} />

            <ul className="space-y-3">
              {items.map((item) => {
                const isExpanded = expandedId === item.id;
                const activeTier = getSpectrumTier(item.severity);
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[#E6E4DD] dark:border-[#283632] bg-white dark:bg-[#18211F] overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left touch-target focus-accessible cursor-pointer select-none"
                    >
                      <span className="space-y-1 min-w-0">
                        <span className="block text-xs sm:text-sm font-bold text-[#19232D] dark:text-[#F1F3EF]">
                          {formatCheckinDate(item.created_at)}
                        </span>
                        <Badge variant={getSeverityBadgeVariant(item.severity)} size="sm" dot>
                          {item.severity}
                        </Badge>
                      </span>
                      <span className="flex items-center gap-2.5 shrink-0">
                        <span className="flex items-baseline gap-1 bg-[#F0FDFA] dark:bg-[#142725] px-3 py-1.5 rounded-2xl border border-[#CCFBF1] dark:border-[#28534E]">
                          <span className="text-lg font-extrabold text-[#0D5C56] dark:text-[#4FA79D]">
                            {item.total_score}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-[#73827D]">
                            / {copy.maxScore}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`text-slate-400 dark:text-[#73827D] text-sm transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          &#9662;
                        </span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-[#283632] space-y-3">
                        <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-xl bg-[#FAF9F6] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632]">
                          {bands.map((band, idx) => {
                            const isCurrent = activeTier === idx;
                            return (
                              <div
                                key={band.label}
                                className={`p-2 rounded-lg text-center transition-all ${
                                  isCurrent
                                    ? 'bg-white dark:bg-[#202B28] border border-[#0D5C56] dark:border-[#4FA79D] shadow-xs ring-1 ring-[#0D5C56]/20 dark:ring-[#4FA79D]/20'
                                    : 'opacity-50'
                                }`}
                              >
                                <p
                                  className={`text-[11px] font-bold ${
                                    isCurrent
                                      ? 'text-[#0D5C56] dark:text-[#4FA79D]'
                                      : 'text-slate-600 dark:text-[#AAB6B1]'
                                  }`}
                                >
                                  {band.label}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-[#73827D] font-mono mt-0.5">
                                  {band.range}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 dark:text-[#F1F3EF] leading-relaxed">
                          {getSeverityDescription(item.severity)}
                        </p>

                        {item.safety_flag && (
                          <Alert variant="crisis" title="Support is available">
                            <p>
                              You noted difficult thoughts at the time of this check-in. You do
                              not have to navigate this alone — free, confidential support is
                              available right now.
                            </p>
                            <p className="pt-1">
                              Tele-MANAS (24/7, toll-free):{' '}
                              <a
                                href="tel:14416"
                                className="font-bold underline text-[#B45309] dark:text-[#E7A044]"
                              >
                                14416
                              </a>{' '}
                              ·{' '}
                              <Link
                                href="/support-now"
                                className="font-bold underline text-[#B45309] dark:text-[#E7A044]"
                              >
                                View all support options
                              </Link>
                            </p>
                          </Alert>
                        )}

                        <p className="text-[11px] text-slate-400 dark:text-[#73827D] leading-relaxed">
                          Checked in on {formatCheckinDate(item.created_at)}. This entry shows
                          only your summary score — it is not a diagnosis.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link href={copy.retakeHref}>
                <Button variant={copy.retakeVariant} size="md">
                  <span>{copy.retakeLabel}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Button>
              </Link>
              <p className="text-[11px] text-slate-500 dark:text-[#73827D] leading-relaxed">
                Retaking a check-in any time records a new private entry above.
              </p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
};
