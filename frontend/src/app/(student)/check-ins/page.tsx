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

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isSessionExpired: boolean }
  | { status: 'ready'; items: ScreeningHistoryItem[] };

function toLoadError(error: unknown): { message: string; isSessionExpired: boolean } {
  if (error instanceof AuthApiError && error.status === 401) {
    return {
      message: 'Your sign-in has expired. Please log in again to view your check-ins.',
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

const CheckinsContent: React.FC = () => {
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
        aria-label="Loading your check-in history"
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
          title="My Check-ins"
          subtitle="Your private PHQ-9 and GAD-7 history, visible only to you."
          badge={{ label: 'Private to your account', variant: 'brand' }}
          backLink={{ href: '/screening', label: 'Back to Self-Assessments' }}
        />
        <div
          className="space-y-6"
          role="status"
          aria-label="Loading your check-in history"
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
          title="My Check-ins"
          subtitle="Your private PHQ-9 and GAD-7 history, visible only to you."
          badge={{ label: 'Private to your account', variant: 'brand' }}
          backLink={{ href: '/screening', label: 'Back to Self-Assessments' }}
        />
        <Alert variant="error" title="We couldn't load your check-ins">
          <p>{state.message}</p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {state.isSessionExpired ? (
              <Link href="/login?next=%2Fcheck-ins">
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
        title="My Check-ins"
        subtitle="Your private PHQ-9 and GAD-7 history, visible only to you. Review past check-ins and retake a screening any time."
        badge={{ label: 'Private to your account', variant: 'brand' }}
        backLink={{ href: '/screening', label: 'Back to Self-Assessments' }}
      />

      {state.items.length === 0 ? (
        <EmptyState
          title="No check-ins yet"
          description="When you complete a PHQ-9 or GAD-7 check-in while signed in, it will appear here — private to your account."
          action={{ label: 'Take your first check-in', href: '/screening', variant: 'brand' }}
        />
      ) : (
        <div className="space-y-6">
          <CheckinHistorySection instrument="PHQ9" items={phq9Items} />
          <CheckinHistorySection instrument="GAD7" items={gad7Items} />
        </div>
      )}

      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] text-xs text-slate-600 dark:text-[#AAB6B1] space-y-1.5 shadow-2xs">
        <p className="font-bold text-[#19232D] dark:text-[#F1F3EF]">
          Private to your account:
        </p>
        <p className="leading-relaxed">
          Only check-ins completed while signed in appear here. Anonymous check-ins are never
          linked to your account, and these summaries are <strong>not medical or psychiatric
          diagnoses</strong>.
        </p>
      </div>
    </div>
  );
};

export default function CheckinsPage() {
  return (
    <RequireAuth>
      <CheckinsContent />
    </RequireAuth>
  );
}
