'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createSlot,
  deleteSlot,
  listAdminCounselors,
  listAdminSlots,
} from '@/lib/admin-api';
import { AdminApiError } from '@/lib/admin-api';
import type { AdminCounselor, AdminCounselorSlot } from '@/lib/admin-types';
import { formatDate, formatTimeRange, statusLabel } from '@/lib/admin-format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

const MAX_SLOT_HOURS = 4;

type Meridiem = 'AM' | 'PM';

/** Parse "H:MM" (12-hour) into 12-hour clock parts. */
function parseTime12(raw: string): { hour12: number; minute: number } | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(raw.trim());
  if (!match) return null;
  const hour12 = Number(match[1]);
  if (hour12 < 1 || hour12 > 12) return null;
  return { hour12, minute: Number(match[2]) };
}

/** Convert a 12-hour clock time (with AM/PM) to a 24-hour hour. */
function to24Hour(hour12: number, meridiem: Meridiem): number {
  if (meridiem === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

/**
 * Format free-form 12-hour keystrokes into "H:MM" text.
 *
 * Strips non-digits and inserts a colon so the user never has to type ":".
 * "1030" -> "10:30", "930" -> "9:30", "10:30" -> "10:30". It never rejects
 * input (so editing stays smooth); strict validity is enforced later by
 * parseTime12() and the backend.
 */
function formatTime12(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 1) return digits;
  if (digits.length === 2) {
    const value = Number(digits);
    return value >= 1 && value <= 12 ? digits : `${digits[0]}:${digits[1]}`;
  }
  if (digits.length === 3) {
    const hour = Number(digits.slice(0, 2));
    return hour >= 1 && hour <= 12
      ? `${digits.slice(0, 2)}:${digits.slice(2)}`
      : `${digits.slice(0, 1)}:${digits.slice(1)}`;
  }
  const hour = Number(digits.slice(0, 2));
  return `${hour >= 1 ? hour : digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function AdminAvailabilityPage() {
  const searchParams = useSearchParams();
  const presetCounselorId = searchParams.get('counselor');

  const [counselors, setCounselors] = useState<AdminCounselor[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [slots, setSlots] = useState<AdminCounselorSlot[]>([]);
  const [loadedFor, setLoadedFor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>('AM');
  const [endTime, setEndTime] = useState('11:00');
  const [endMeridiem, setEndMeridiem] = useState<Meridiem>('AM');
  const [isAdding, setIsAdding] = useState(false);

  const [toDelete, setToDelete] = useState<AdminCounselorSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    listAdminCounselors()
      .then((data) => {
        setCounselors(data);
        const initial =
          (presetCounselorId && data.some((c) => c.id === presetCounselorId)
            ? presetCounselorId
            : data.find((c) => c.is_active)?.id) ?? data[0]?.id ?? '';
        setSelectedId(initial);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Unable to load counselors.'
        );
      });
  }, [presetCounselorId]);

  const selectedCounselor = useMemo(
    () => counselors?.find((c) => c.id === selectedId) ?? null,
    [counselors, selectedId]
  );

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    listAdminSlots(selectedId)
      .then((data) => {
        if (!cancelled) {
          setLoadedFor(selectedId);
          setSlots(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load slots.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const slotsReady = loadedFor === selectedId;
  const sortedSlots = useMemo(() => {
    if (!slotsReady) return [] as AdminCounselorSlot[];
    return slots
      .slice()
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
  }, [slots, slotsReady]);

  const addSlot = async () => {
    if (!selectedCounselor) return;
    if (!date) {
      setSlotError('Pick a date for the slot.');
      return;
    }
    const startParsed = parseTime12(startTime);
    const endParsed = parseTime12(endTime);
    if (!startParsed || !endParsed) {
      setSlotError(
        'Enter a valid time (1–12 hours, 00–59 minutes) and choose AM/PM.'
      );
      return;
    }
    const [year, month, day] = date.split('-').map(Number);

    const start = new Date(
      year,
      month - 1,
      day,
      to24Hour(startParsed.hour12, startMeridiem),
      startParsed.minute
    );
    const end = new Date(
      year,
      month - 1,
      day,
      to24Hour(endParsed.hour12, endMeridiem),
      endParsed.minute
    );

    if (end <= start) {
      setSlotError('End time must be after the start time.');
      return;
    }
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours > MAX_SLOT_HOURS) {
      setSlotError(`Slots cannot be longer than ${MAX_SLOT_HOURS} hours.`);
      return;
    }
    if (start.getTime() < Date.now()) {
      setSlotError('Slots must be in the future.');
      return;
    }

    setIsAdding(true);
    setSlotError(null);
    try {
      await createSlot(selectedCounselor.id, start.toISOString(), end.toISOString());
      setDate('');
      setStartTime('10:00');
      setStartMeridiem('AM');
      setEndTime('11:00');
      setEndMeridiem('AM');
      const updated = await listAdminSlots(selectedCounselor.id);
      setLoadedFor(selectedCounselor.id);
      setSlots(updated);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setSlotError(err.message);
      } else {
        setSlotError('Unable to add the slot. Please try again.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteSlot(toDelete.counselor_id, toDelete.id);
      setSlots((prev) =>
        (prev ?? []).filter((s) => s.id !== toDelete.id)
      );
      setToDelete(null);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('Unable to delete the slot. Please try again.');
      }
      setToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
        <p className="mt-1 text-slate-600">
          Manage counseling appointment slots and see their booking status.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="sm:max-w-sm">
        <Select
          id="availability-counselor"
          label="Counselor"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {counselors === null && <option value="">Loading counselors…</option>}
          {(counselors ?? []).map((counselor) => (
            <option key={counselor.id} value={counselor.id}>
              {counselor.name} ({counselor.is_active ? 'active' : 'inactive'})
            </option>
          ))}
        </Select>
      </div>

      {selectedCounselor && (
        <section aria-labelledby="add-slot-heading" className="space-y-3">
          <h2
            id="add-slot-heading"
            className="text-lg font-bold text-slate-900"
          >
            Add a slot for {selectedCounselor.name}
          </h2>
          {slotError && <Alert variant="error">{slotError}</Alert>}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                id="slot-date"
                label="Date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="slot-start"
                    label="Start time"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{1,2}:[0-9]{2}"
                    placeholder="HH:MM (e.g. 1030)"
                    maxLength={5}
                    autoComplete="off"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(formatTime12(event.target.value))
                    }
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Select
                    id="slot-start-meridiem"
                    label="AM/PM"
                    value={startMeridiem}
                    onChange={(event) =>
                      setStartMeridiem(event.target.value as Meridiem)
                    }
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="slot-end"
                    label="End time"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{1,2}:[0-9]{2}"
                    placeholder="HH:MM (e.g. 1100)"
                    maxLength={5}
                    autoComplete="off"
                    value={endTime}
                    onChange={(event) =>
                      setEndTime(formatTime12(event.target.value))
                    }
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Select
                    id="slot-end-meridiem"
                    label="AM/PM"
                    value={endMeridiem}
                    onChange={(event) =>
                      setEndMeridiem(event.target.value as Meridiem)
                    }
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </Select>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Times are 12-hour with AM/PM in your local timezone. Type the
              time as digits (e.g. 1030) or with a colon (10:30). Slots are
              limited to {MAX_SLOT_HOURS} hours and must be in the future.
            </p>
            <div className="mt-4">
              <Button
                variant="brand"
                onClick={addSlot}
                isLoading={isAdding}
              >
                Add slot
              </Button>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="slots-heading" className="space-y-3">
        <h2 id="slots-heading" className="text-lg font-bold text-slate-900">
          Upcoming slots
        </h2>
        {!selectedCounselor ? (
          <p className="text-sm text-slate-500 py-4">
            Select a counselor to manage their availability.
          </p>
        ) : !slotsReady ? (
          <p className="text-sm text-slate-500 py-4">Loading slots…</p>
        ) : sortedSlots.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            No upcoming slots for this counselor.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedSlots.map((slot) => {
              const booked = slot.booking_status !== null;
              return (
                <li
                  key={slot.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {formatDate(slot.starts_at)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatTimeRange(slot.starts_at, slot.ends_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={booked ? 'amber' : 'sage'}>
                      {slot.booking_status
                        ? statusLabel(slot.booking_status)
                        : 'Available'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={booked}
                      onClick={() => setToDelete(slot)}
                      aria-label={`Delete slot on ${formatDate(slot.starts_at)}`}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => {
          if (!isDeleting) setToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete slot"
        description={`Delete the slot on ${
          toDelete ? formatDate(toDelete.starts_at) : ''
        }? Booked slots cannot be deleted.`}
        confirmLabel="Delete slot"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}