'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScreeningResponse } from '@/lib/types';
import { submitFollowup } from '@/lib/api';

export default function ScreeningResultPage() {
  const router = useRouter();
  const [screening] = useState<ScreeningResponse | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('mh_last_screening');
      if (stored) {
        try {
          return JSON.parse(stored) as ScreeningResponse;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [isFollowupLoading, setIsFollowupLoading] = useState(false);
  const [followupStatus, setFollowupStatus] = useState<string | null>(null);

  if (!screening) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-xl font-bold text-[#19232D] dark:text-[#F1F3EF]">No recent check-in found</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AAB6B1]">
          Complete a PHQ-9 or GAD-7 check-in to see your score and self-care recommendations.
        </p>
        <Link href="/screening">
          <Button variant="primary" size="md">
            <span>Go to Check-ins</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
      </div>
    );
  }

  const isPHQ9 = screening.instrument === 'PHQ9';
  const maxScore = isPHQ9 ? 27 : 21;
  const hasSafetyFlag = screening.safety_flag || (screening.item9_score ?? 0) > 0;

  const getSeverityBadgeVariant = (sev: string): 'brand' | 'sage' | 'amber' | 'coral' | 'neutral' => {
    const lower = sev.toLowerCase();
    if (lower.includes('minimal')) return 'sage';
    if (lower.includes('mild')) return 'sage';
    if (lower.includes('moderately severe') || lower.includes('severe')) return 'coral';
    if (lower.includes('moderate')) return 'amber';
    return 'neutral';
  };

  const getSeverityDescription = (severity: string) => {
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
  };

  // Determine active spectrum tier (0: Minimal, 1: Mild, 2: Moderate, 3: Severe)
  const getSpectrumTier = (sev: string): number => {
    const lower = sev.toLowerCase();
    if (lower.includes('minimal')) return 0;
    if (lower.includes('mild')) return 1;
    if (lower.includes('moderately severe') || lower.includes('severe')) return 3;
    return 2; // Moderate
  };

  const activeTier = getSpectrumTier(screening.severity);

  const spectrumBands = isPHQ9
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

  const handleEscalateCrisis = async () => {
    setIsFollowupLoading(true);
    try {
      await submitFollowup({
        session_id: screening.session_id,
        screening_id: screening.id,
        action: 'ESCALATE_CRISIS',
      });
      router.push('/support-now');
    } catch {
      router.push('/support-now');
    } finally {
      setIsFollowupLoading(false);
    }
  };

  const handleSupportiveCare = async () => {
    setIsFollowupLoading(true);
    try {
      const resp = await submitFollowup({
        session_id: screening.session_id,
        screening_id: screening.id,
        action: 'SUPPORTIVE_CARE',
      });
      setFollowupStatus(resp.supportive_guidance || 'Supportive care pathway confirmed.');
    } catch {
      setFollowupStatus('Thank you for sharing. We encourage you to explore our counseling and self-care resources.');
    } finally {
      setIsFollowupLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 py-2 sm:py-6">
      {/* 1. TOP BREADCRUMB */}
      <div className="flex items-center justify-between">
        <Link
          href="/screening"
          className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1] hover:text-[#0D5C56] dark:hover:text-[#4FA79D] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Take Another Check-in
        </Link>
        <Badge variant={getSeverityBadgeVariant(screening.severity)} size="sm" dot>
          {screening.instrument} Assessment Result
        </Badge>
      </div>

      {/* 2. MAIN RESULT CARD */}
      <Card variant="elevated" padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6E4DD] dark:border-[#283632]">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 dark:text-[#73827D] uppercase tracking-wider">
              {isPHQ9 ? 'PHQ-9 Mood Check-in' : 'GAD-7 Anxiety Check-in'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#19232D] dark:text-[#F1F3EF]">
              Result: <span className="text-[#0D5C56] dark:text-[#4FA79D]">{screening.severity}</span>
            </h1>
          </div>
          <div className="flex items-baseline gap-1.5 bg-[#F0FDFA] dark:bg-[#142725] px-4 py-3 rounded-2xl border border-[#CCFBF1] dark:border-[#28534E] text-center sm:text-right shrink-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1]">Total Score:</span>
            <span className="text-2xl font-extrabold text-[#0D5C56] dark:text-[#4FA79D]">{screening.total_score}</span>
            <span className="text-xs font-medium text-slate-400 dark:text-[#73827D]">/ {maxScore}</span>
          </div>
        </div>

        {/* 3. VISUAL SYMPTOM SPECTRUM */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-[#AAB6B1]">
            <span>Symptom Intensity Spectrum</span>
            <span className="text-[#0D5C56] dark:text-[#4FA79D] font-bold">Your band: {screening.severity}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-xl bg-[#FAF9F6] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632]">
            {spectrumBands.map((band, idx) => {
              const isCurrent = activeTier === idx;

              return (
                <div
                  key={band.label}
                  className={`p-2.5 rounded-lg text-center transition-all ${
                    isCurrent
                      ? 'bg-white dark:bg-[#202B28] border border-[#0D5C56] dark:border-[#4FA79D] shadow-xs ring-1 ring-[#0D5C56]/20 dark:ring-[#4FA79D]/20'
                      : 'opacity-50'
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-[#0D5C56] dark:text-[#4FA79D]' : 'text-slate-600 dark:text-[#AAB6B1]'
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
        </div>

        {/* 4. PLAIN-LANGUAGE EXPLANATION */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold text-slate-500 dark:text-[#AAB6B1] uppercase tracking-wider">
            What this score reflects
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-[#F1F3EF] leading-relaxed">
            {getSeverityDescription(screening.severity)}
          </p>
        </div>

        {/* 5. MEDICAL DISCLAIMER */}
        <div className="p-3.5 bg-[#FAF9F6] dark:bg-[#141C1A] rounded-xl border border-[#E6E4DD] dark:border-[#283632] text-xs text-slate-500 dark:text-[#AAB6B1] space-y-1">
          <p className="font-bold text-slate-700 dark:text-[#F1F3EF]">Non-Diagnostic Self-Reflection:</p>
          <p className="leading-relaxed">
            This score indicates symptom frequency over the past 14 days and is <strong>not a clinical or psychiatric diagnosis</strong>. Emotional states fluctuate naturally with exam deadlines, sleep patterns, and campus life.
          </p>
        </div>
      </Card>

      {/* 6. ITEM-9 SAFETY FOLLOW-UP CARD (WARM AMBER, SUPPORTIVE) */}
      {hasSafetyFlag && (
        <Card variant="crisis" padding="lg" className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-[#92400E] dark:text-[#FDE68A]">
              Safety &amp; Well-being Check-in
            </h2>
            <p className="text-xs sm:text-sm text-[#78350F] dark:text-[#FDE68A] leading-relaxed">
              Your check-in indicated thoughts regarding self-harm or ending your life. You do not have to navigate this alone. Free, confidential support is available right now.
            </p>
          </div>

          {followupStatus ? (
            <div className="p-4 bg-white/90 dark:bg-[#18211F] rounded-xl border border-[#FDE68A] dark:border-[#5E421E] text-xs text-[#78350F] dark:text-[#FDE68A] space-y-2">
              <p className="font-semibold">{followupStatus}</p>
              <p>
                Tele-MANAS free 24/7 national helpline is always reachable at <a href="tel:14416" className="font-bold underline text-[#B45309] dark:text-[#E7A044]">14416</a>.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold text-[#92400E] dark:text-[#FDE68A]">
                How would you like to proceed?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="crisis"
                  size="md"
                  onClick={handleEscalateCrisis}
                  isLoading={isFollowupLoading}
                  className="sm:w-1/2"
                >
                  <span>Connect with 24/7 Crisis Helplines</span>
                  <span aria-hidden="true">&rarr;</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleSupportiveCare}
                  disabled={isFollowupLoading}
                  className="sm:w-1/2"
                >
                  I prefer supportive resources &amp; self-care
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 7. RECOMMENDED NEXT STEPS */}
      <section aria-labelledby="next-steps-heading" className="space-y-3 pt-2">
        <h2 id="next-steps-heading" className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] uppercase tracking-wider">
          Recommended Next Steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="interactive" padding="md">
            <Link href="/chat" className="block space-y-1.5 focus-accessible">
              <h3 className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-sm">Talk &amp; Reflect</h3>
              <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
                Decompress and explore tailored stress-reduction exercises.
              </p>
              <span className="text-xs font-semibold text-[#0D5C56] dark:text-[#4FA79D] inline-flex items-center pt-1">
                Start a conversation &rarr;
              </span>
            </Link>
          </Card>

          <Card variant="interactive" padding="md">
            <Link href="/booking" className="block space-y-1.5 focus-accessible">
              <h3 className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-sm">University Counseling</h3>
              <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
                Schedule a confidential 1-on-1 session with a campus counselor.
              </p>
              <span className="text-xs font-semibold text-[#0D5C56] dark:text-[#4FA79D] inline-flex items-center pt-1">
                View Counselors &rarr;
              </span>
            </Link>
          </Card>

          <Card variant="interactive" padding="md">
            <Link href="/resources" className="block space-y-1.5 focus-accessible">
              <h3 className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-sm">Self-Care Tools</h3>
              <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
                Discover somatic breathing exercises and sleep hygiene guides.
              </p>
              <span className="text-xs font-semibold text-[#0D5C56] dark:text-[#4FA79D] inline-flex items-center pt-1">
                View Resources &rarr;
              </span>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
