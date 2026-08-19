'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/components/admin/AdminGuard';
import { getBookings } from '@/lib/admin-api';
import type { AdminBooking } from '@/lib/admin-types';
import { maskContact, formatDateTime, statusBadgeVariant } from '@/lib/admin-format';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { admin } = useAdminSession();
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBookings('ALL')
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load bookings.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const list = bookings ?? [];
    return {
      total: list.length,
      pending: list.filter((b) => b.status === 'PENDING').length,
      confirmed: list.filter((b) => b.status === 'CONFIRMED').length,
      completed: list.filter((b) => b.status === 'COMPLETED').length,
    };
  }, [bookings]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return (bookings ?? [])
      .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
      .filter((b) => new Date(b.slot.starts_at) >= now)
      .sort(
        (a, b) =>
          new Date(a.slot.starts_at).getTime() -
          new Date(b.slot.starts_at).getTime()
      )
      .slice(0, 8);
  }, [bookings]);

  const recent = useMemo(() => {
    return (bookings ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [bookings]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {admin?.username}
        </h1>
        <p className="mt-1 text-slate-600">
          Overview of your counseling service operations.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <section aria-label="Booking statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total bookings" value={stats.total} accent="text-slate-900" />
        <StatCard label="Pending" value={stats.pending} accent="text-amber-600" />
        <StatCard label="Confirmed" value={stats.confirmed} accent="text-emerald-600" />
        <StatCard label="Completed" value={stats.completed} accent="text-[#0F766E]" />
      </section>

      <section aria-labelledby="upcoming-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-heading" className="text-lg font-bold text-slate-900">
            Upcoming appointments
          </h2>
          <Link
            href="/admin/bookings"
            className="text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded"
          >
            View all bookings
          </Link>
        </div>
        {bookings === null ? (
          <p className="text-sm text-slate-500 py-4">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            No upcoming pending or confirmed appointments.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {formatDateTime(booking.slot.starts_at)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {booking.counselor.name} ·{' '}
                    {maskContact(booking) ?? 'Anonymous student'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={statusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded"
                  >
                    Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <h2 id="recent-heading" className="text-lg font-bold text-slate-900">
          Recent bookings
        </h2>
        {bookings === null ? (
          <p className="text-sm text-slate-500 py-4">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No bookings yet.</p>
        ) : (
          <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {recent.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {booking.confirmation_code}
                  </p>
                  <p className="text-sm text-slate-600">
                    {booking.counselor.name} ·{' '}
                    {maskContact(booking) ?? 'Anonymous student'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-slate-500">
                    {formatDateTime(booking.created_at)}
                  </span>
                  <Badge variant={statusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}