'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ensureSession } from '@/lib/session';
import { createBooking } from '@/lib/api';

function formatSlotLabel(startsIso: string, endsIso: string): string {
  const start = new Date(startsIso);
  const end = new Date(endsIso);
  const date = start.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const time = `${start.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${end.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  return `${date} at ${time}`;
}

function BookingConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counselorId = searchParams?.get('counselor') || '';
  const counselorName = searchParams?.get('name') || 'Your counselor';
  const slotId = searchParams?.get('slot') || '';
  const starts = searchParams?.get('starts') || '';
  const ends = searchParams?.get('ends') || '';

  const [studentName, setStudentName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const missingSlot = !counselorId || !slotId || !starts || !ends;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
      setErrorMessage('Please enter a valid email address or leave it blank.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const sessionId = await ensureSession();
      const booking = await createBooking({
        slot_id: slotId,
        session_id: sessionId,
        student_name: studentName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        reason: reason.trim() || undefined,
      });

      const params = new URLSearchParams({
        code: booking.confirmation_code,
      });
      router.push(`/booking/${booking.id}?${params.toString()}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'We could not complete your booking. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link
          href={slotId ? `/booking/slots?counselor=${encodeURIComponent(counselorId)}&name=${encodeURIComponent(counselorName)}` : '/booking'}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 focus-accessible p-1"
        >
          &larr; Choose a different time
        </Link>
        <Badge variant="brand" size="sm">
          University Counseling
        </Badge>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Request an appointment
        </h1>
        <p className="text-sm text-slate-600">
          Review your details and submit your request. Everything except the
          appointment time is optional.
        </p>
      </div>

      {missingSlot && (
        <Card variant="crisis" padding="md" className="space-y-3">
          <p className="text-sm font-semibold text-amber-950">
            No appointment time selected.
          </p>
          <Link href="/booking">
            <Button variant="outline" size="sm">
              Back to counseling team
            </Button>
          </Link>
        </Card>
      )}

      {!missingSlot && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card variant="sage" padding="lg" className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Your appointment
            </h2>
            <div className="space-y-1.5 text-sm text-slate-800">
              <p>
                <span className="font-semibold">Counselor: </span>
                {counselorName}
              </p>
              <p>
                <span className="font-semibold">Time: </span>
                {formatSlotLabel(starts, ends)}
              </p>
            </div>
          </Card>

          <Card variant="default" padding="lg" className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Your details (optional)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="studentName" className="block text-sm font-medium text-slate-700">
                  Your name (optional)
                </label>
                <input
                  id="studentName"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="How should the counselor address you?"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700">
                  Email (optional)
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="555-0100"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
                  What you&apos;d like to talk about (optional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Exam stress, anxiety, feeling overwhelmed..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {errorMessage && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Link
              href={`/booking/slots?counselor=${encodeURIComponent(counselorId)}&name=${encodeURIComponent(counselorName)}`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 focus-accessible touch-target"
            >
              Back
            </Link>
            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="flex-1">
              Confirm appointment request
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading your appointment details...
        </div>
      }
    >
      <BookingConfirmContent />
    </Suspense>
  );
}