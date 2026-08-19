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
        <h1 className="text-xl font-bold text-slate-800">No recent screening found</h1>
        <p className="text-sm text-slate-500">
          Complete a PHQ-9 or GAD-7 check-in to see your score and self-care recommendations.
        </p>
        <Link href="/screening">
          <Button variant="primary" size="md">
            Go to Check-ins &rarr;
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

  const getSeverityDescription = (instrument: string, severity: string) => {
    const sev = severity.toLowerCase();
    if (sev.includes('minimal')) {
      return 'Your score reflects minimal to no significant symptoms over the past 2 weeks. Continuing everyday healthy habits (sleep, movement, breaks) helps maintain baseline wellness.';
    }
    if (sev.includes('mild')) {
      return 'Your score suggests mild symptoms. While these may not severely interfere with daily routine, engaging in proactive self-care, mindfulness, and talking with supportive friends can be helpful.';
    }
    if (sev.includes('moderately severe') || sev.includes('severe')) {
      return 'Your score indicates significant symptom intensity that may be heavily impacting academic focus, sleep, or daily activities. Connecting with a campus counselor or healthcare provider is strongly recommended.';
    }
    // Moderate
    return 'Your score reflects moderate symptom levels. Consider exploring stress reduction techniques, speaking with a university counselor, or discussing your feelings with someone you trust.';
  };

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
      // Even if the network call fails, safety comes first: redirect to crisis helplines
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
    <div className="max-w-3xl mx-auto w-full space-y-6 py-4">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/screening"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 focus-accessible p-1"
        >
          &larr; Take Another Check-in
        </Link>
        <Badge variant={getSeverityBadgeVariant(screening.severity)} size="sm">
          {screening.instrument} Assessment Result
        </Badge>
      </div>

      {/* Main Result Card */}
      <Card variant="default" padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isPHQ9 ? 'PHQ-9 Depression Screener' : 'GAD-7 Anxiety Screener'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Your Result: <span className="text-[#0F766E]">{screening.severity}</span>
            </h1>
          </div>
          <div className="flex items-baseline gap-1 bg-[#F0FDFA] p-4 rounded-2xl border border-[#CCFBF1] text-center sm:text-right shrink-0">
            <span className="text-3xl font-extrabold text-[#0F766E]">{screening.total_score}</span>
            <span className="text-sm font-semibold text-slate-400">/ {maxScore}</span>
          </div>
        </div>

        {/* Clinical Plain-Language Explanation */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            What this score means
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            {getSeverityDescription(screening.instrument, screening.severity)}
          </p>
        </div>

        {/* Non-Diagnostic Disclaimer */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Important Medical Disclaimer:</p>
          <p>
            This score is an indicator of symptom frequency over the past 14 days, <strong>not a medical or psychiatric diagnosis</strong>. Mood and anxiety fluctuate with semester deadlines and life circumstances.
          </p>
        </div>
      </Card>

      {/* PHQ-9 Item 9 Safety Check-in Card (Calm Warm Amber, NOT alarming red) */}
      {hasSafetyFlag && (
        <Card variant="crisis" padding="lg" className="space-y-4 border-l-8 border-l-[#D97706]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" aria-hidden="true" />
              <h2 className="text-base font-bold text-amber-950">
                Safety & Well-being Check-in
              </h2>
            </div>
            <p className="text-sm text-amber-950 leading-relaxed">
              Your check-in indicated thoughts regarding self-harm or ending your life. You do not have to carry this alone. Confidential, compassionate support is available right now.
            </p>
          </div>

          {followupStatus ? (
            <div className="p-4 bg-white/90 rounded-xl border border-[#FDE68A] text-xs text-amber-950 space-y-2">
              <p className="font-semibold">{followupStatus}</p>
              <p>
                Tele-MANAS free 24/7 national helpline is always reachable at <a href="tel:14416" className="font-bold underline text-[#B45309]">14416</a>.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-amber-900">
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
                  I need immediate crisis support &rarr;
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleSupportiveCare}
                  disabled={isFollowupLoading}
                  className="sm:w-1/2 bg-white"
                >
                  I prefer supportive resources / self-care
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Suggested Next Steps */}
      <section aria-labelledby="next-steps-heading" className="space-y-3 pt-2">
        <h2 id="next-steps-heading" className="text-base font-bold text-slate-800">
          Recommended Next Steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="interactive" padding="md">
            <Link href="/chat" className="block space-y-2 focus-accessible">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">💬</span>
                <h3 className="font-bold text-slate-900 text-sm">Talk with AI Assistant</h3>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Discuss personalized coping exercises for your current stress and anxiety levels.
              </p>
              <span className="text-xs font-semibold text-[#0F766E] inline-flex items-center pt-1">
                Open Chat &rarr;
              </span>
            </Link>
          </Card>

          <Card variant="interactive" padding="md">
            <Link href="/resources" className="block space-y-2 focus-accessible">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">🌿</span>
                <h3 className="font-bold text-slate-900 text-sm">Explore Student Resources</h3>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Discover campus counseling services, guided mindfulness tools, and sleep guides.
              </p>
              <span className="text-xs font-semibold text-[#0F766E] inline-flex items-center pt-1">
                View Resources &rarr;
              </span>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
