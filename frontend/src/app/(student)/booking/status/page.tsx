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
  })} at ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const STATUS_VARIANTS: Record<
  BookingStatus['status'],
  'amber' | 'sage' | 'neutral' | 'coral'
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
    heading: 'Awaiting confirmation',
    body: 'Your appointment request has been received by the university counseling team.',
  },
  CONFIRMED: {
    heading: 'Appointment confirmed',
    body: 'Your counseling appointment is confirmed.',
  },
  CANCELLED: {
    heading: 'Appointment cancelled',
    body: 'This appointment has been cancelled.',
  },
  COMPLETED: {
    heading: 'Appointment completed',
    body: 'This appointment has been completed.',
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
        'Enter your confirmation code to check your appointment.'
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
            : 'We could not check your appointment. Please try again.'
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
    <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
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

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Check your counseling appointment
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
          Enter your confirmation code to see the latest status of your
          appointment. No student account required.
        </p>
      </div>

      {/* Lookup form */}
      <Card variant="default" padding="lg" className="space-y-4">
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
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isChecking}
              fullWidth
              className="sm:w-auto"
            >
              Check appointment
            </Button>
          </div>
        </form>
        <p className="text-xs text-slate-500">
          The code is shown after you request an appointment. You can look up
          your status anytime with this code.
        </p>
      </Card>

      {/* Not-found */}
      {notFound && (
        <Alert variant="warning" title="We could not find your appointment">
          No appointment matches that confirmation code. Check the code and try
          again. Your request may not have gone through.
        </Alert>
      )}

      {/* Network/server error */}
      {errorMessage && (
        <Alert variant="error" title="We could not check your appointment">
          <p className="mb-2">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleCheck}>
            Try again
          </Button>
        </Alert>
      )}

      {/* Valid appointment */}
      {status && (
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              {STATUS_COPY[status.status].heading}
            </h2>
            <Badge variant={STATUS_VARIANTS[status.status]} size="sm">
              {status.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {STATUS_COPY[status.status].body}
          </p>
          <dl className="space-y-3 text-sm border-t border-slate-100 pt-4">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500 font-medium shrink-0">Counselor</dt>
              <dd className="text-slate-900 font-semibold text-right">
                {status.counselor_name}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500 font-medium shrink-0">When</dt>
              <dd className="text-slate-900 font-semibold text-right">
                {formatDateTime(status.starts_at)}
                <span className="block text-xs font-normal text-slate-500">
                  to {formatDateTime(status.ends_at)}
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500 font-medium shrink-0">
                Confirmation code
              </dt>
              <dd className="text-slate-900 font-mono font-semibold text-right">
                {status.confirmation_code}
              </dd>
            </div>
          </dl>
          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Check another code
            </Button>
          </div>
        </Card>
      )}

      {/* Quiet reassurance for terminal states */}
      {status && status.status === 'CANCELLED' && (
        <Card variant="default" padding="md" className="space-y-2">
          <p className="text-xs text-slate-500">
            Feel free to book another time or explore other support pathways.
          </p>
          <Link href="/booking">
            <Button variant="secondary" size="md">
              Book a new appointment
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}