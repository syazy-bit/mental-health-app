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
    year: 'numeric',
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
          : 'We could not complete your booking request. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-2 sm:py-6">
      {/* 1. BREADCRUMB & HEADER */}
      <div className="flex items-center justify-between">
        <Link
          href={slotId ? `/booking/slots?counselor=${encodeURIComponent(counselorId)}&name=${encodeURIComponent(counselorName)}` : '/booking'}
          className="text-xs font-semibold text-slate-500 hover:text-[#0D5C56] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Choose a different time
        </Link>
        <Badge variant="brand" size="sm" dot>
          University Counseling
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#19232D] tracking-tight">
          Review &amp; confirm your appointment
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Review your appointment time and optional details below. Only the appointment time is required.
        </p>
      </div>

      {/* 2. MISSING SLOT WARNING */}
      {missingSlot && (
        <Card variant="crisis" padding="lg" className="space-y-3 border border-[#FDE68A]">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#92400E]">
              No appointment time selected
            </h2>
            <p className="text-xs sm:text-sm text-[#78350F]">
              Please select an available appointment slot before confirming.
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

      {/* 3. CONFIRMATION FORM */}
      {!missingSlot && (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* APPOINTMENT SUMMARY CARD */}
          <Card variant="sage" padding="lg" className="bg-[#F4F7F5] border border-[#E6E4DD] space-y-3">
            <span className="text-xs font-bold text-[#0D5C56] uppercase tracking-wider">
              Selected Appointment
            </span>
            <div className="space-y-2 text-sm text-[#19232D]">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-slate-500 font-medium">Counselor</span>
                <span className="text-sm font-bold text-[#19232D] text-right">{counselorName}</span>
              </div>
              <div className="flex items-start justify-between gap-4 border-t border-[#E6E4DD]/60 pt-2">
                <span className="text-xs text-slate-500 font-medium">When</span>
                <span className="text-sm font-bold text-[#19232D] text-right">{formatSlotLabel(starts, ends)}</span>
              </div>
              <div className="flex items-start justify-between gap-4 border-t border-[#E6E4DD]/60 pt-2">
                <span className="text-xs text-slate-500 font-medium">Duration</span>
                <span className="text-xs font-semibold text-slate-700 text-right">50 minutes (standard session)</span>
              </div>
            </div>
          </Card>

          {/* OPTIONAL STUDENT DETAILS */}
          <Card variant="default" padding="lg" className="bg-white border border-[#E6E4DD] space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[#19232D] uppercase tracking-wider">
                Your details (Optional)
              </h2>
              <p className="text-xs text-slate-500">
                You can leave these blank to book anonymously, or provide details if you want your counselor to know in advance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="studentName" className="block text-xs font-bold text-[#19232D]">
                  Name or preferred name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="studentName"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="How should the counselor address you?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] text-sm text-[#19232D] placeholder:text-slate-400 focus:bg-white focus:border-[#0D5C56] focus:ring-2 focus:ring-[#0D5C56]/20 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contactEmail" className="block text-xs font-bold text-[#19232D]">
                  Email <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] text-sm text-[#19232D] placeholder:text-slate-400 focus:bg-white focus:border-[#0D5C56] focus:ring-2 focus:ring-[#0D5C56]/20 focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="contactPhone" className="block text-xs font-bold text-[#19232D]">
                  Phone number <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 555-0100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] text-sm text-[#19232D] placeholder:text-slate-400 focus:bg-white focus:border-[#0D5C56] focus:ring-2 focus:ring-[#0D5C56]/20 focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="reason" className="block text-xs font-bold text-[#19232D]">
                  What would you like to focus on? <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Exam stress, burnout, anxiety, relationships..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] text-sm text-[#19232D] placeholder:text-slate-400 focus:bg-white focus:border-[#0D5C56] focus:ring-2 focus:ring-[#0D5C56]/20 focus:outline-none transition-all"
                />
              </div>
            </div>
          </Card>

          {/* PRIVACY NOTICE */}
          <Card variant="default" padding="md" className="bg-[#FAF9F6] border border-[#E6E4DD] space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Privacy &amp; Data Handling
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Any details you provide are shared only with the university counseling team for this appointment. They are kept completely separate from self-guided chats and check-in scores.
            </p>
          </Card>

          {errorMessage && (
            <div role="alert" className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Link
              href={`/booking/slots?counselor=${encodeURIComponent(counselorId)}&name=${encodeURIComponent(counselorName)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold border border-[#E6E4DD] text-slate-700 hover:bg-slate-50 focus-accessible touch-target transition-colors"
            >
              &larr; Back to slots
            </Link>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              isLoading={isSubmitting}
              className="flex-1"
            >
              <span>Confirm appointment request</span>
              <span aria-hidden="true">&rarr;</span>
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
          Loading appointment details...
        </div>
      }
    >
      <BookingConfirmContent />
    </Suspense>
  );
}