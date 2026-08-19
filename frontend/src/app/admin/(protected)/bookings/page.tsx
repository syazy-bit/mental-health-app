'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getBookings } from '@/lib/admin-api';
import type { AdminBooking, BookingStatus } from '@/lib/admin-types';
import {
  formatDateTime,
  maskContact,
  statusBadgeVariant,
  statusLabel,
} from '@/lib/admin-format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';

type Filter = BookingStatus | 'ALL';

const filterOptions: Filter[] = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
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

  const filtered = useMemo(() => {
    const list = bookings ?? [];
    if (filter === 'ALL') return list;
    return list.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const sorted = useMemo(
    () =>
      filtered
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [filtered]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-1 text-slate-600">
            Appointment requests from students. Contact details are masked.
          </p>
        </div>
        <div className="sm:w-56">
          <Select
            id="booking-status-filter"
            label="Filter by status"
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            {filterOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All statuses' : statusLabel(option)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {bookings === null ? (
        <p className="text-sm text-slate-500 py-6">Loading bookings…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500 py-6">
          No bookings{filter !== 'ALL' ? ` with status ${statusLabel(filter)}` : ''} yet.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">
                Booking requests with counselor, slot time, and status.
              </caption>
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Counselor
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Appointment
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Requested
                  </th>
                  <th scope="col">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {booking.confirmation_code}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(booking.status)}>
                        {statusLabel(booking.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {maskContact(booking) ?? 'Anonymous student'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {booking.counselor.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(booking.slot.starts_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDateTime(booking.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded px-2 py-1 touch-target"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bookings !== null && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {filtered.length} of {bookings.length} bookings shown
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => getBookings('ALL').then(setBookings).catch(() => undefined)}
          >
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}