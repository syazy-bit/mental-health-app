'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthApiError } from '@/lib/auth-api';
import { fetchCheckinHistory } from '@/lib/checkins';
import type { ScreeningHistoryItem } from '@/lib/types';
import { CheckinHistorySection } from '@/components/checkins/CheckinHistorySection';
import { MomentsSection } from '@/components/moments/MomentsSection';
import { WhatHelpedSection } from '@/components/tools/WhatHelpedSection';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isSessionExpired: boolean }
  | { status: 'ready'; items: ScreeningHistoryItem[] };

function toLoadError(error: unknown): { message: string; isSessionExpired: boolean } {
  if (error instanceof AuthApiError && error.status === 401) {
    return {
      message: 'Your sign-in has expired. Please log in again to view your Story.',
      isSessionExpired: true,
    };
  }
  if (error instanceof AuthApiError && error.status === 0) {
    return {
      message: 'Unable to reach the server. Please check your connection and try again.',
      isSessionExpired: false,
    };
  }
  return {
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
    isSessionExpired: false,
  };
}

/**
 * My Story (MVP): the authenticated student's private record of what they
 * have been going through — their owned PHQ-9 / GAD-7 check-in history.
 *
 * Frontend-only: uses the existing GET /api/screenings/history contract via
 * fetchCheckinHistory (same as /check-ins). Moments and What-helped are
 * honest coming-soon UI only — no backend, no fake data, no fake actions.
 */
const StoryContent: React.FC = () => {
  const { status: authStatus, user: authUser } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Authenticated-only page: never request account history while anonymous.
    // (RequireAuth redirects signed-out visitors to login; this guard simply
    // avoids firing the request before that redirect resolves.)
    if (authStatus !== 'authenticated' || !authUser) {
      return;
    }
    let cancelled = false;
    fetchCheckinHistory({ status: authStatus, user: authUser })
      .then((response) => {
        if (!cancelled) {
          setState({ status: 'ready', items: response.items });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', ...toLoadError(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, authUser, reloadKey]);

  // While auth resolves or an anonymous visitor awaits the login redirect,
  // render the same calm skeleton rather than flashing protected content.
  if (authStatus !== 'authenticated' || !authUser) {
    return (
      <div
        className="max-w-4xl mx-auto space-y-6 py-2 sm:py-6"
        role="status"
        aria-label="Loading your Story"
      >
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-6">
        <PageHeader
          title="My Story"
          subtitle="A private record of what you've been going through — visible only to you."
          badge={{ label: 'Private to your account', variant: 'brand' }}
        />
        <div
          className="space-y-6"
          role="status"
          aria-label="Loading your Story"
        >
          {[0, 1].map((key) => (
            <Card key={key} variant="elevated" padding="lg" className="space-y-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-6">
        <PageHeader
          title="My Story"
          subtitle="A private record of what you've been going through — visible only to you."
          badge={{ label: 'Private to your account', variant: 'brand' }}
        />
        <Alert variant="error" title="We couldn't load your Story">
          <p>{state.message}</p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {state.isSessionExpired ? (
              <Link href="/login?next=%2Fstory">
                <Button variant="brand" size="md">
                  <span>Log in again</span>
                  <span aria-hidden="true">&rarr;</span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="brand"
                size="md"
                onClick={() => {
                  setState({ status: 'loading' });
                  setReloadKey((k) => k + 1);
                }}
              >
                Try again
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  const phq9Items = state.items.filter((item) => item.instrument === 'PHQ9');
  const gad7Items = state.items.filter((item) => item.instrument === 'GAD7');

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-6">
      <PageHeader
        title="My Story"
        subtitle="A private record of what you've been going through — what you measured, what you chose to remember, and what you said helped. Newest first, visible only to you."
        badge={{ label: 'Private to your account', variant: 'brand' }}
      />

      {/* Entry actions: New check-in is real; Moments manages its own composer. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="default" padding="md" className="flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF]">
              New check-in
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
              PHQ-9 or GAD-7. Takes about 2 minutes. A new private entry appears below.
            </p>
          </div>
          <Link href="/screening" className="block">
            <Button variant="brand" size="md" fullWidth>
              <span>Start a check-in</span>
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </Link>
        </Card>

        <Card variant="default" padding="md" className="flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF]">
              Write a moment
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
              A short note in your own words, kept only in your Story.
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              const heading = document.getElementById('moments-heading');
              heading?.scrollIntoView?.({ block: 'start' });
              document.getElementById('moment-composer')?.focus({ preventScroll: true });
            }}
          >
            <span>Write a moment</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </Card>
      </div>

      {state.items.length === 0 ? (
        <EmptyState
          title="Your Story starts here"
          description="When you complete a PHQ-9 or GAD-7 check-in while signed in, it will appear here — private to your account. Anonymous check-ins never appear here."
          action={{ label: 'Take your first check-in', href: '/screening', variant: 'brand' }}
        />
      ) : (
        <div className="space-y-6">
          <CheckinHistorySection instrument="PHQ9" items={phq9Items} />
          <CheckinHistorySection instrument="GAD7" items={gad7Items} />
        </div>
      )}

      <MomentsSection auth={{ status: authStatus, user: authUser }} />

      <WhatHelpedSection auth={{ status: authStatus, user: authUser }} />

      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] text-xs text-slate-600 dark:text-[#AAB6B1] space-y-1.5 shadow-2xs">
        <p className="font-bold text-[#19232D] dark:text-[#F1F3EF]">
          Private to your account:
        </p>
        <p className="leading-relaxed">
          Only check-ins completed while signed in appear here. Anonymous check-ins and
          anonymous conversations are never added to My Story, even after you sign in,
          and these summaries are <strong>not medical or psychiatric
          diagnoses</strong>.
        </p>
      </div>
    </div>
  );
};

export default function StoryPage() {
  return (
    <RequireAuth>
      <StoryContent />
    </RequireAuth>
  );
}
