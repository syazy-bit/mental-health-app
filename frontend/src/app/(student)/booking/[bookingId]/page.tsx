'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Booking } from '@/lib/types';
import { cancelBooking, getBooking } from '@/lib/api';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })} at ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const STATUS_VARIANTS: Record<Booking['status'], 'amber' | 'sage' | 'neutral'> = {
  PENDING: 'amber',
  CONFIRMED: 'sage',
  CANCELLED: 'neutral',
  COMPLETED: 'neutral',
};

function BookingDetailContent() {
  const params = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const bookingId = params?.bookingId || '';
  const code = searchParams?.get('code') || '';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    getBooking(bookingId, { code: code || undefined })
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'We could not find this appointment.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, code]);

  const handleCopyCode = async () => {
    if (!booking?.confirmation_code) return;
    try {
      await navigator.clipboard.writeText(booking.confirmation_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    setErrorMessage(null);
    try {
      const updated = await cancelBooking(booking.id, {
        code: booking.confirmation_code,
      });
      setBooking(updated);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'We could not cancel this appointment. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto w-full py-12 text-center text-sm text-slate-500 dark:text-[#AAB6B1]">
        Loading your appointment details...
      </div>
    );
  }

  if (errorMessage && !booking) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-xl font-bold text-[#19232D] dark:text-[#F1F3EF]">
          Appointment not found
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AAB6B1]">{errorMessage}</p>
        <Link href="/booking" className="inline-block pt-2">
          <Button variant="brand" size="md">
            <span>Back to counseling team</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const isActive = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-2 sm:py-6">
      {/* 1. BREADCRUMB & STATUS */}
      <div className="flex items-center justify-between">
        <Link
          href="/booking"
          className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1] hover:text-[#0D5C56] dark:hover:text-[#4FA79D] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Back to counseling team
        </Link>
        <Badge variant={STATUS_VARIANTS[booking.status]} size="sm" dot>
          {booking.status}
        </Badge>
      </div>

      {/* 2. MAIN HEADING */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#19232D] dark:text-[#F1F3EF] tracking-tight">
          {booking.status === 'CONFIRMED'
            ? 'Your appointment is confirmed'
            : booking.status === 'PENDING'
            ? 'Your appointment is requested'
            : `Appointment ${booking.status.toLowerCase()}`}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
          Here is your official appointment confirmation and reference details.
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="p-4 bg-amber-50 dark:bg-[#281F13] border border-amber-200 dark:border-[#5E421E] rounded-xl text-amber-900 dark:text-[#FDE68A] text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* 3. PROMINENT CONFIRMATION CODE BOX */}
      <Card variant="sage" padding="lg" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#73827D]">
              Appointment Reference Code
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-[#0D5C56] dark:text-[#4FA79D] tracking-wider select-all">
              {booking.confirmation_code}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#0D5C56]/30 dark:border-[#4FA79D]/40 bg-white dark:bg-[#18211F] text-[#0D5C56] dark:text-[#4FA79D] hover:bg-[#F0FDFA] dark:hover:bg-[#142725] focus-accessible touch-target transition-all shrink-0 cursor-pointer"
            aria-label="Copy confirmation code"
          >
            {copied ? '✓ Copied to clipboard' : 'Copy reference code'}
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed border-t border-[#E6E4DD]/60 dark:border-[#283632] pt-2.5">
          Keep this code somewhere safe. You can use it on the <Link href="/booking/status" className="underline font-semibold hover:text-[#0D5C56] dark:hover:text-[#4FA79D]">Appointment Status</Link> page to view or manage your appointment anytime without creating an account.
        </p>
      </Card>

      {/* 4. APPOINTMENT DETAILS SUMMARY */}
      <Card variant="default" padding="lg" className="space-y-4">
        <h2 className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] uppercase tracking-wider">
          Appointment Details
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-xs font-medium text-slate-500 dark:text-[#73827D] shrink-0">Counselor</dt>
            <dd className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] text-right">
              {booking.counselor.name}
              <span className="block text-xs font-normal text-slate-500 dark:text-[#73827D]">
                {booking.counselor.title}
              </span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-slate-100 dark:border-[#283632] pt-3">
            <dt className="text-xs font-medium text-slate-500 dark:text-[#73827D] shrink-0">Date &amp; Time</dt>
            <dd className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] text-right">
              {formatDateTime(booking.slot.starts_at)}
              <span className="block text-xs font-normal text-slate-500 dark:text-[#73827D]">
                to {formatDateTime(booking.slot.ends_at)} (50 min)
              </span>
            </dd>
          </div>
          {booking.student_name && (
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 dark:border-[#283632] pt-3">
              <dt className="text-xs font-medium text-slate-500 dark:text-[#73827D] shrink-0">Name</dt>
              <dd className="text-sm font-semibold text-[#19232D] dark:text-[#F1F3EF] text-right">{booking.student_name}</dd>
            </div>
          )}
          {booking.reason && (
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 dark:border-[#283632] pt-3">
              <dt className="text-xs font-medium text-slate-500 dark:text-[#73827D] shrink-0">Focus / Notes</dt>
              <dd className="text-xs sm:text-sm text-slate-700 dark:text-[#AAB6B1] text-right max-w-xs">{booking.reason}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* 5. WHAT HAPPENS NEXT */}
      <Card variant="default" padding="lg" className="bg-[#FAF9F6] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632] space-y-3">
        <h2 className="text-xs font-bold text-[#19232D] dark:text-[#F1F3EF] uppercase tracking-wider">
          What Happens Next
        </h2>
        <ul className="space-y-2 text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed list-disc list-inside">
          <li>Your appointment is registered with the campus counseling team.</li>
          <li>Save your 8-character reference code to check status or cancel anytime.</li>
          <li>If you cannot attend, please cancel in advance so another student can use the slot.</li>
        </ul>
      </Card>

      {/* 6. CANCELLATION / ACTIONS */}
      {isActive && (
        <Card variant="default" padding="md" className="space-y-2.5">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-[#19232D] dark:text-[#F1F3EF] uppercase tracking-wider">
              Need to cancel?
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#73827D]">
              If your plans change, you can cancel this appointment anytime. The time slot will immediately be made available for other students.
            </p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              isLoading={isCancelling}
              disabled={!isActive}
              className="text-slate-600 dark:text-[#AAB6B1] hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800"
            >
              Cancel this appointment
            </Button>
          </div>
        </Card>
      )}

      {booking.status === 'CANCELLED' && (
        <Card variant="default" padding="md" className="space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-[#19232D] dark:text-[#F1F3EF]">
            This appointment has been cancelled.
          </p>
          <p className="text-xs text-slate-500 dark:text-[#73827D]">
            You can select another time or explore our self-guided resources and support lines.
          </p>
          <div className="pt-2">
            <Link href="/booking">
              <Button variant="brand" size="md">
                <span>Book a new appointment</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* 7. RETURN PATHWAYS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Card variant="interactive" padding="md">
          <Link href="/chat" className="block space-y-1.5 focus-accessible">
            <h3 className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-xs sm:text-sm">
              Talk &amp; Reflect
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#73827D] leading-normal">
              Practice grounding exercises or talk through your thoughts while you wait.
            </p>
            <span className="text-xs font-semibold text-[#0D5C56] dark:text-[#4FA79D] inline-flex items-center pt-1">
              Start a conversation &rarr;
            </span>
          </Link>
        </Card>
        <Card variant="interactive" padding="md">
          <Link href="/resources" className="block space-y-1.5 focus-accessible">
            <h3 className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-xs sm:text-sm">
              Explore Wellbeing Resources
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#73827D] leading-normal">
              Access 24/7 helplines, sensory tools, and guided relaxation exercises.
            </p>
            <span className="text-xs font-semibold text-[#0D5C56] dark:text-[#4FA79D] inline-flex items-center pt-1">
              View Resources &rarr;
            </span>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 dark:text-[#AAB6B1] text-sm">
          Loading your appointment details...
        </div>
      }
    >
      <BookingDetailContent />
    </Suspense>
  );
}