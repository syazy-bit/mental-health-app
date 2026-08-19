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
  })} at ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const STATUS_VARIANTS: Record<Booking['status'], 'amber' | 'sage' | 'neutral' | 'coral'> = {
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
      <div className="text-center py-12 text-sm text-slate-500">
        Loading your appointment...
      </div>
    );
  }

  if (errorMessage && !booking) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-800">
          Appointment not found
        </h1>
        <p className="text-sm text-slate-500">{errorMessage}</p>
        <Link href="/booking">
          <Button variant="primary" size="md">
            Back to counseling team
          </Button>
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const isActive = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link
          href="/booking"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 focus-accessible p-1"
        >
          &larr; Back to counseling team
        </Link>
        <Badge variant={STATUS_VARIANTS[booking.status]} size="sm">
          {booking.status}
        </Badge>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {isActive ? 'Your appointment is requested' : `Appointment ${booking.status.toLowerCase()}`}
        </h1>
        <p className="text-sm text-slate-600">
          Save this page or your confirmation code to view or manage your
          appointment.
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Confirmation code card */}
      <Card variant="sage" padding="lg" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Confirmation code
          </span>
          <code className="text-2xl font-mono font-bold tracking-widest text-[#0F766E] select-all">
            {booking.confirmation_code}
          </code>
        </div>
      </Card>

      {/* Appointment details */}
      <Card variant="default" padding="lg" className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Appointment details
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-slate-500 font-medium shrink-0">Counselor</dt>
            <dd className="text-slate-900 font-semibold text-right">
              {booking.counselor.name}
              <span className="block text-xs font-normal text-slate-500">
                {booking.counselor.title}
              </span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-slate-500 font-medium shrink-0">When</dt>
            <dd className="text-slate-900 font-semibold text-right">
              {formatDateTime(booking.slot.starts_at)}
              <span className="block text-xs font-normal text-slate-500">
                to {formatDateTime(booking.slot.ends_at)}
              </span>
            </dd>
          </div>
          {booking.student_name && (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500 font-medium shrink-0">Name</dt>
              <dd className="text-slate-900 font-semibold text-right">{booking.student_name}</dd>
            </div>
          )}
          {booking.reason && (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500 font-medium shrink-0">Reason</dt>
              <dd className="text-slate-700 text-right">{booking.reason}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Actions */}
      {isActive && (
        <Card variant="subtle" padding="md" className="space-y-3">
          <p className="text-sm text-slate-700">
            Changed your mind? You can cancel this appointment. The time will be
            released for other students.
          </p>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCancel}
            isLoading={isCancelling}
            disabled={!isActive}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Cancel this appointment
          </Button>
        </Card>
      )}

      {booking.status === 'CANCELLED' && (
        <Card variant="default" padding="md" className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            This appointment has been cancelled.
          </p>
          <p className="text-xs text-slate-500">
            Feel free to book another time or explore other support pathways.
          </p>
          <div className="pt-1">
            <Link href="/booking">
              <Button variant="secondary" size="md">
                Book a new appointment
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Card variant="interactive" padding="md">
          <Link href="/chat" className="block space-y-2 focus-accessible">
            <h3 className="font-bold text-slate-900 text-sm">
              Talk with AI Assistant
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              Get supportive coping exercises while you wait for your appointment.
            </p>
            <span className="text-xs font-semibold text-[#0F766E] inline-flex items-center pt-1">
              Open Chat &rarr;
            </span>
          </Link>
        </Card>
        <Card variant="interactive" padding="md">
          <Link href="/resources" className="block space-y-2 focus-accessible">
            <h3 className="font-bold text-slate-900 text-sm">
              Explore Resources
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              Discover helplines, self-care tools, and wellbeing guides.
            </p>
            <span className="text-xs font-semibold text-[#0F766E] inline-flex items-center pt-1">
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
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading your appointment...
        </div>
      }
    >
      <BookingDetailContent />
    </Suspense>
  );
}