'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { ApiError, getBookingStatus } from '@/lib/api';
import { BookingStatus } from '@/lib/types';

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

const STATUS_VARIANTS: Record<
  BookingStatus['status'],
  'amber' | 'sage' | 'neutral'
> = {
  PENDING: 'amber',
  CONFIRMED: 'sage',
  CANCELLED: 'neutral',
  COMPLETED: 'neutral',
};

const STATUS_COPY: Record<
  BookingStatus['status'],
  { heading: string; body: string }
> = {
  PENDING: {
    heading: 'Awaiting Counselor Review',
    body: 'Your appointment request has been received by the university counseling office.',
  },
  CONFIRMED: {
    heading: 'Appointment Confirmed',
    body: 'Your appointment is confirmed with your campus counselor.',
  },
  CANCELLED: {
    heading: 'Appointment Cancelled',
    body: 'This appointment was cancelled. The time slot has been opened for other students.',
  },
  COMPLETED: {
    heading: 'Appointment Completed',
    body: 'This counseling session has concluded.',
  },
};

export default function BookingStatusPage() {
  const [code, setCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking) return;

    const trimmed = code.trim();
    if (!trimmed) {
      setStatus(null);
      setNotFound(false);
      setErrorMessage(
        'Please enter your 8-character confirmation code to check status.'
      );
      return;
    }

    setIsChecking(true);
    setStatus(null);
    setNotFound(false);
    setErrorMessage(null);
    try {
      const result = await getBookingStatus(trimmed);
      setStatus(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'We could not verify this appointment right now. Please try again.'
        );
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setStatus(null);
    setNotFound(false);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-2 sm:py-6">
      {/* 1. BREADCRUMB & HEADER */}
      <div className="flex items-center justify-between">
        <Link
          href="/booking"
          className="text-xs font-semibold text-slate-500 hover:text-[#0D5C56] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Back to counseling team
        </Link>
        <Badge variant="brand" size="sm" dot>
          Appointment Lookup
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#19232D] tracking-tight">
          Check your appointment
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
          Enter your 8-character confirmation code to retrieve your appointment status and schedule details. No login or student account required.
        </p>
      </div>

      {/* 2. LOOKUP FORM */}
      <Card variant="default" padding="lg" className="bg-white border border-[#E6E4DD] space-y-4">
        <form onSubmit={handleCheck} className="space-y-4" noValidate>
          <Input
            id="status-code"
            label="Confirmation code"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. ABC12345"
            maxLength={16}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            helperText="Your 8-character code was provided when you requested the appointment."
          />
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              type="submit"
              variant="brand"
              size="md"
              isLoading={isChecking}
              fullWidth
              className="sm:w-auto"
            >
              <span>Check appointment status</span>
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. NOT FOUND ALERT */}
      {notFound && (
        <Alert variant="warning" title="Appointment not found">
          No appointment matches the code &quot;{code}&quot;. Please double-check your reference code and try again.
        </Alert>
      )}

      {/* 4. NETWORK / SERVER ERROR */}
      {errorMessage && (
        <Alert variant="error" title="Unable to retrieve appointment">
          <p className="mb-2">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleCheck}>
            Try again
          </Button>
        </Alert>
      )}

      {/* 5. VALID APPOINTMENT FOUND */}
      {status && (
        <Card variant="default" padding="lg" className="bg-white border border-[#E6E4DD] space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-[#19232D]">
              {STATUS_COPY[status.status].heading}
            </h2>
            <Badge variant={STATUS_VARIANTS[status.status]} size="sm" dot>
              {status.status}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {STATUS_COPY[status.status].body}
          </p>

          <dl className="space-y-3 text-sm border-t border-slate-100 pt-4">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-xs font-medium text-slate-500 shrink-0">Counselor</dt>
              <dd className="text-sm font-bold text-[#19232D] text-right">
                {status.counselor_name}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-xs font-medium text-slate-500 shrink-0">When</dt>
              <dd className="text-sm font-bold text-[#19232D] text-right">
                {formatDateTime(status.starts_at)}
                <span className="block text-xs font-normal text-slate-500">
                  to {formatDateTime(status.ends_at)} (50 min)
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-xs font-medium text-slate-500 shrink-0">
                Confirmation Code
              </dt>
              <dd className="text-sm font-mono font-bold text-[#0D5C56] text-right select-all">
                {status.confirmation_code}
              </dd>
            </div>
          </dl>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Check another code
            </Button>
          </div>
        </Card>
      )}

      {/* 6. REASSURANCE FOR CANCELLED STATUS */}
      {status && status.status === 'CANCELLED' && (
        <Card variant="default" padding="md" className="bg-[#FAF9F6] border border-[#E6E4DD] space-y-2">
          <p className="text-xs text-slate-600">
            Would you like to book a new appointment with another available time slot?
          </p>
          <div className="pt-1">
            <Link href="/booking">
              <Button variant="brand" size="sm">
                <span>Book a new appointment</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}