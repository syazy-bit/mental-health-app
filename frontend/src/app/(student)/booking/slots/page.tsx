'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CounselorSlot } from '@/lib/types';
import { listCounselorSlots } from '@/lib/api';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSlotDateHeader(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
  })}`;
}

function formatSlotTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Group slots by date string (e.g., "Monday, August 25")
function groupSlotsByDate(slots: CounselorSlot[]): Record<string, CounselorSlot[]> {
  const groups: Record<string, CounselorSlot[]> = {};
  for (const slot of slots) {
    const dateKey = formatSlotDateHeader(slot.starts_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(slot);
  }
  return groups;
}

function BookingSlotsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counselorId = searchParams?.get('counselor') || '';
  const counselorName = searchParams?.get('name') || 'Your counselor';

  const [slots, setSlots] = useState<CounselorSlot[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(counselorId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!counselorId) return;

    let cancelled = false;
    listCounselorSlots(counselorId)
      .then((data) => {
        if (!cancelled) {
          setSlots(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to load available times.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [counselorId]);

  const handleSelectSlot = (slot: CounselorSlot) => {
    const params = new URLSearchParams({
      counselor: counselorId,
      name: counselorName,
      slot: slot.id,
      starts: slot.starts_at,
      ends: slot.ends_at,
    });
    router.push(`/booking/confirm?${params.toString()}`);
  };

  const groupedSlots = groupSlotsByDate(slots);
  const dateKeys = Object.keys(groupedSlots);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 py-2 sm:py-6">
      {/* 1. BREADCRUMB & CONTEXT */}
      <div className="flex items-center justify-between">
        <Link
          href="/booking"
          className="text-xs font-semibold text-slate-500 hover:text-[#0D5C56] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Back to counseling team
        </Link>
        <Badge variant="brand" size="sm" dot>
          University Counseling
        </Badge>
      </div>

      {/* 2. HEADER */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Availability for {counselorName}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#19232D] tracking-tight">
          Choose a time that works for you
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Select an available appointment time below. Times are shown in your local timezone.
        </p>
      </div>

      {/* 3. MISSING COUNSELOR ID ERROR */}
      {!counselorId && (
        <Card variant="crisis" padding="lg" className="space-y-3 border border-[#FDE68A]">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#92400E]">
              No counselor selected
            </h2>
            <p className="text-xs sm:text-sm text-[#78350F]">
              Please choose a counselor from our team to see their schedule.
            </p>
          </div>
          <Link href="/booking" className="inline-block">
            <Button variant="primary" size="sm">
              <span>Back to counseling team</span>
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </Link>
        </Card>
      )}

      {/* 4. LOADING STATE */}
      {counselorId && isLoading && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-[#E6E4DD] space-y-3 animate-pulse">
            <div className="w-40 h-5 rounded bg-slate-100" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
            </div>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-[#E6E4DD] space-y-3 animate-pulse">
            <div className="w-40 h-5 rounded bg-slate-100" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      )}

      {/* 5. ERROR STATE */}
      {counselorId && !isLoading && errorMessage && (
        <Card variant="crisis" padding="lg" className="space-y-3 border border-[#FDE68A]">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#92400E]">
              We could not load available times
            </h2>
            <p className="text-xs sm:text-sm text-[#78350F]">{errorMessage}</p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                setErrorMessage(null);
                listCounselorSlots(counselorId)
                  .then(setSlots)
                  .catch((err) =>
                    setErrorMessage(
                      err instanceof Error ? err.message : 'Failed to load available times.'
                    )
                  )
                  .finally(() => setIsLoading(false));
              }}
              className="bg-white"
            >
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* 6. EMPTY SLOTS STATE */}
      {counselorId && !isLoading && !errorMessage && slots.length === 0 && (
        <Card variant="default" padding="lg" className="text-center space-y-4 py-10 bg-white border border-[#E6E4DD]">
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-bold text-[#19232D]">
              No upcoming appointments available right now
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Please check back soon or choose another counselor from our team.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/booking">
              <Button variant="secondary" size="md">
                <span>View other counselors</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* 7. SLOTS GROUPED BY DATE */}
      {counselorId && !isLoading && !errorMessage && slots.length > 0 && (
        <div className="space-y-6">
          {dateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0D5C56]" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#19232D]">
                  {dateKey}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groupedSlots[dateKey].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSelectSlot(slot)}
                    className="w-full p-4 rounded-xl border border-[#E6E4DD] bg-white text-left transition-all hover:border-[#0D5C56] hover:bg-[#F0FDFA] shadow-2xs hover:shadow-xs focus-accessible cursor-pointer touch-target flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <span className="block text-xs font-medium text-slate-500">
                        Appointment Time
                      </span>
                      <span className="block text-sm font-bold text-[#19232D] group-hover:text-[#0D5C56]">
                        {formatSlotTime(slot.starts_at)} &ndash; {formatSlotTime(slot.ends_at)}
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold text-[#0D5C56] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      aria-hidden="true"
                    >
                      <span>Select</span>
                      <span>&rarr;</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. HELPFUL INFORMATION */}
      <Card variant="default" padding="md" className="bg-white border border-[#E6E4DD] space-y-1.5">
        <h2 className="text-xs font-bold text-[#19232D] uppercase tracking-wider">Good to know</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Sessions are 50 minutes long. After choosing a time, you will receive a private 8-character confirmation code to manage or reschedule your appointment anytime.
        </p>
      </Card>
    </div>
  );
}

export default function BookingSlotsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading available times...
        </div>
      }
    >
      <BookingSlotsContent />
    </Suspense>
  );
}