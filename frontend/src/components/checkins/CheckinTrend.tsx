'use client';

import React from 'react';
import type { ScreeningHistoryItem } from '@/lib/types';
import { formatCheckinDate } from '@/lib/screening-display';

export interface CheckinTrendProps {
  instrument: 'PHQ9' | 'GAD7';
  /** History items, newest first (API order). */
  items: ScreeningHistoryItem[];
}

const MAX_SCORE: Record<CheckinTrendProps['instrument'], number> = {
  PHQ9: 27,
  GAD7: 21,
};

/**
 * Neutral score-over-time summary for one instrument.
 *
 * - 0–1 results: renders nothing (a single result stands alone).
 * - 2 results: factual side-by-side comparison only.
 * - 3+ results: neutral trajectory bars in a single non-judgmental color.
 *
 * Never uses better/worse (or any directional judgment) language: scores
 * simply move, and this view only lists recorded scores.
 */
export const CheckinTrend: React.FC<CheckinTrendProps> = ({ instrument, items }) => {
  if (items.length < 2) {
    return null;
  }

  const label = instrument === 'PHQ9' ? 'PHQ-9' : 'GAD-7';

  if (items.length === 2) {
    const [latest, previous] = items;
    return (
      <div className="p-3.5 bg-[#FAF9F6] dark:bg-[#141C1A] rounded-xl border border-[#E6E4DD] dark:border-[#283632] text-xs text-slate-600 dark:text-[#AAB6B1] space-y-1.5">
        <p className="font-bold text-[#19232D] dark:text-[#F1F3EF]">
          Your two most recent {label} check-ins
        </p>
        <p className="leading-relaxed">
          Latest: <strong>{latest.total_score}</strong> on {formatCheckinDate(latest.created_at)}
          {' · '}Previous: <strong>{previous.total_score}</strong> on{' '}
          {formatCheckinDate(previous.created_at)}.
        </p>
        <p className="leading-relaxed text-slate-500 dark:text-[#73827D]">
          With two check-ins you can see both scores side by side.
        </p>
      </div>
    );
  }

  const chronological = [...items].reverse();
  const maxScore = MAX_SCORE[instrument];

  return (
    <div className="p-3.5 bg-[#FAF9F6] dark:bg-[#141C1A] rounded-xl border border-[#E6E4DD] dark:border-[#283632] space-y-2.5">
      <p className="text-xs font-bold text-[#19232D] dark:text-[#F1F3EF]">
        Your {label} check-in scores over time
      </p>
      <div
        className="space-y-2"
        role="img"
        aria-label={`${label} scores over time, oldest to most recent: ${chronological
          .map((item) => `${item.total_score} on ${formatCheckinDate(item.created_at)}`)
          .join(', ')}`}
      >
        {chronological.map((item) => {
          const width = Math.min(100, Math.max(4, Math.round((item.total_score / maxScore) * 100)));
          // Presentational duplicate of the role="img" summary above: hidden
          // from assistive tech so dates/scores are announced exactly once.
          return (
            <div key={item.id} aria-hidden="true" className="flex items-center gap-2.5">
              <span className="w-20 shrink-0 text-[11px] text-slate-500 dark:text-[#73827D]">
                {formatCheckinDate(item.created_at)}
              </span>
              <div className="flex-1 h-2.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0E5A54] dark:bg-[#57ADA3] rounded-full"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-7 shrink-0 text-right text-xs font-bold text-[#19232D] dark:text-[#F1F3EF]">
                {item.total_score}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-[#73827D] leading-relaxed">
        Scores can move up or down over time. This view only lists your recorded scores — it is
        not a diagnosis.
      </p>
    </div>
  );
};
