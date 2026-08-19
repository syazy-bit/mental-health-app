'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CounselorSlot } from '@/lib/types';
import { listCounselorSlots } from '@/lib/api';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSlotDate(iso: string): string {
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

function BookingSlotsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counselorId = searchParams?.get('counselor') || '';
  const counselorName = searchParams?.get('name') || 'Your counselor';

  const [slots, setSlots] = useState<CounselorSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link
          href="/booking"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 focus-accessible p-1"
        >
          &larr; Back to counseling team
        </Link>
        <Badge variant="brand" size="sm">
          University Counseling
        </Badge>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {counselorName}
        </h1>
        <p className="text-sm text-slate-600">
          Choose an available appointment time:
        </p>
      </div>

      {!counselorId && (
        <Card variant="crisis" padding="md" className="space-y-2">
          <p className="text-sm font-semibold text-amber-950">
            No counselor selected. Please choose a counselor first.
          </p>
          <Link href="/booking">
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus-accessible touch-target">
              Back to counseling team
            </span>
          </Link>
        </Card>
      )}

      {counselorId && isLoading && (
        <div className="text-center py-12 text-sm text-slate-500">
          Loading available times...
        </div>
      )}

      {counselorId && !isLoading && errorMessage && (
        <Card variant="crisis" padding="md" className="space-y-2">
          <p className="text-sm font-semibold text-amber-950">
            We could not load available times.
          </p>
          <p className="text-xs text-amber-900">{errorMessage}</p>
        </Card>
      )}

      {counselorId && !isLoading && !errorMessage && slots.length === 0 && (
        <Card variant="subtle" padding="lg" className="text-center space-y-2">
          <p className="font-semibold text-slate-700">
            No upcoming appointments are available right now.
          </p>
          <p className="text-xs text-slate-500">
            Please check back soon or reach out to your university counseling
            office directly.
          </p>
        </Card>
      )}

      {counselorId && !isLoading && !errorMessage && slots.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => handleSelectSlot(slot)}
              className="w-full p-5 rounded-2xl border border-slate-200 bg-white text-left transition-all hover:border-[#0F766E] hover:bg-[#F0FDFA]/60 shadow-xs hover:shadow-md focus-accessible cursor-pointer touch-target"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="block text-sm font-bold text-slate-900">
                    {formatSlotDate(slot.starts_at)}
                  </span>
                  <span className="block text-sm font-semibold text-[#0F766E]">
                    {formatSlotTime(slot.starts_at)} &ndash; {formatSlotTime(slot.ends_at)}
                  </span>
                </div>
                <span
                  className="text-[#0F766E] font-bold text-lg"
                  aria-hidden="true"
                >
                  &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Card variant="subtle" padding="md" className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">Good to know</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Times are shown in your local time. You can cancel or change your
          appointment anytime using the confirmation code shown after booking.
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