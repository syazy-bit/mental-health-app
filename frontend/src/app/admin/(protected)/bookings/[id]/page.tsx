'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getBookings, updateBookingStatus } from '@/lib/admin-api';
import { AdminApiError } from '@/lib/admin-api';
import type { AdminBooking, BookingStatus } from '@/lib/admin-types';
import {
  formatDateTime,
  maskEmail,
  maskPhone,
  statusBadgeVariant,
  statusLabel,
} from '@/lib/admin-format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

const transitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
};

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;

  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<BookingStatus | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBookings('ALL')
      .then((data) => {
        if (!cancelled) {
          const found = data.find((b) => b.id === bookingId) ?? null;
          setBookings(data);
          setBooking(found);
          setAdminNotes(found?.admin_notes ?? '');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load the booking.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const confirmAction = async () => {
    if (!booking || !pendingAction) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateBookingStatus(
        booking.id,
        pendingAction,
        adminNotes.trim() || undefined
      );
      setBookings((prev) =>
        (prev ?? []).map((b) => (b.id === updated.id ? updated : b))
      );
      setBooking(updated);
      setAdminNotes(updated.admin_notes ?? '');
      setPendingAction(null);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('Unable to update the booking. Please try again.');
      }
      setPendingAction(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link
          href="/admin/bookings"
          className="inline-block text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded"
        >
          ← Back to bookings
        </Link>
      </div>
    );
  }

  if (bookings === null) {
    return <p className="text-sm text-slate-500 py-6">Loading booking…</p>;
  }

  if (!booking) {
    return (
      <div className="space-y-4">
        <Alert variant="warning" title="Booking not found">
          This booking could not be found. It may have been removed.
        </Alert>
        <Link
          href="/admin/bookings"
          className="inline-block text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded"
        >
          ← Back to bookings
        </Link>
      </div>
    );
  }

  const availableActions = transitions[booking.status] ?? [];
  const revealed = reveal && booking;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {booking.confirmation_code}
          </h1>
          <Badge variant={statusBadgeVariant(booking.status)}>
            {statusLabel(booking.status)}
          </Badge>
        </div>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="appointment-heading"
          className="lg:col-span-2 space-y-4"
        >
          <h2
            id="appointment-heading"
            className="text-lg font-bold text-slate-900"
          >
            Appointment details
          </h2>
          <dl className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Counselor</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {booking.counselor.name}
              </dd>
              <dd className="text-slate-600">{booking.counselor.title}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Start time</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {formatDateTime(booking.slot.starts_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">End time</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {formatDateTime(booking.slot.ends_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Requested</dt>
              <dd className="mt-1 text-slate-900">
                {formatDateTime(booking.created_at)}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="student-heading" className="space-y-4">
          <h2 id="student-heading" className="text-lg font-bold text-slate-900">
            Student information
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-sm">
            {!revealed ? (
              <>
                <p className="text-slate-600">
                  Contact details are hidden by default to protect student
                  privacy.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 font-medium">Email</p>
                    <p className="mt-1 text-slate-900">
                      {maskEmail(booking.contact_email) ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Phone</p>
                    <p className="mt-1 text-slate-900">
                      {maskPhone(booking.contact_phone) ?? '—'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Reason for visit</p>
                  <p className="mt-1 text-slate-700 italic">Hidden</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReveal(true)}
                >
                  Reveal contact &amp; reason
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-slate-500 font-medium">Student name</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {booking.student_name || 'Not provided'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 font-medium">Email</p>
                    <p className="mt-1 text-slate-900">
                      {booking.contact_email || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Phone</p>
                    <p className="mt-1 text-slate-900">
                      {booking.contact_phone || 'Not provided'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Reason for visit</p>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {booking.reason || 'Not provided'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReveal(false)}
                >
                  Hide contact details
                </Button>
              </>
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="notes-heading" className="space-y-3">
        <h2 id="notes-heading" className="text-lg font-bold text-slate-900">
          Admin notes
        </h2>
        <Input
          id="admin-notes"
          label="Notes (saved when you update the status)"
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.target.value)}
          placeholder="Add internal notes for the counseling team…"
        />
      </section>

      {availableActions.length > 0 && (
        <section aria-labelledby="actions-heading" className="space-y-3">
          <h2 id="actions-heading" className="text-lg font-bold text-slate-900">
            Update status
          </h2>
          <div className="flex flex-wrap gap-3">
            {availableActions.map((action) => (
              <Button
                key={action}
                variant={action === 'CANCELLED' ? 'primary' : 'brand'}
                onClick={() => setPendingAction(action)}
              >
                {action === 'CANCELLED'
                  ? 'Cancel booking'
                  : `Mark as ${statusLabel(action)}`}
              </Button>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => {
          if (!isSaving) setPendingAction(null);
        }}
        onConfirm={confirmAction}
        title={`${pendingAction === 'CANCELLED' ? 'Cancel' : 'Confirm'} booking`}
        description={
          pendingAction === 'CANCELLED'
            ? `Cancel booking ${booking.confirmation_code}? The student will be notified.`
            : `Mark booking ${booking.confirmation_code} as ${statusLabel(
                pendingAction ?? booking.status
              )}?`
        }
        confirmLabel={
          pendingAction === 'CANCELLED' ? 'Cancel booking' : 'Confirm'
        }
        variant={pendingAction === 'CANCELLED' ? 'danger' : 'primary'}
        isLoading={isSaving}
      />
    </div>
  );
}