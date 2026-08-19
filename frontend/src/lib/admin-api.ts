/**
 * Admin portal API client.
 *
 * This is the ONLY module the admin UI uses to talk to the backend. It is
 * deliberately isolated from the student-facing client in `@/lib/api.ts` so
 * the admin portal can never accidentally call student wellbeing endpoints.
 *
 * Authorized endpoints used here:
 *   POST /api/admin/auth/login
 *   GET  /api/admin/auth/me
 *   GET  /api/admin/bookings
 *   GET  /api/admin/bookings/{id}
 *   PATCH /api/admin/bookings/{id}/status
 *   GET/POST/PATCH /api/admin/counselors...
 *   GET/POST/DELETE /api/admin/counselors/{id}/slots...
 *
 * The wellbeing analytics endpoint GET /api/admin/dashboard is NEVER called.
 */

import {
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from '@/lib/admin-auth';
import type {
  AdminBooking,
  AdminCounselor,
  AdminCounselorPayload,
  AdminCounselorSlot,
  AdminCounselorUpdatePayload,
  AdminLoginResponse,
  AdminMe,
  BookingStatus,
} from '@/lib/admin-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Register a handler invoked when the backend rejects the admin session. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function handleUnauthorized(): void {
  clearAdminToken();
  unauthorizedHandler?.();
}

interface AdminRequestOptions extends RequestInit {
  /** Do not trigger the global session-expiry redirect (used by login). */
  skipUnauthorizedRedirect?: boolean;
}

async function adminRequest<T>(
  endpoint: string,
  options: AdminRequestOptions = {}
): Promise<T> {
  const { skipUnauthorizedRedirect = false, ...fetchOptions } = options;
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new AdminApiError(
      0,
      'Unable to reach the server. Please check your connection and try again.'
    );
  }

  if (response.status === 401) {
    if (!skipUnauthorizedRedirect) {
      handleUnauthorized();
    }
    throw new AdminApiError(
      401,
      'Your session has expired. Please sign in again.'
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) {
        message =
          typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail);
      }
    } catch {
      // Non-JSON error body - use the default message.
    }
    throw new AdminApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(
  username: string,
  password: string
): Promise<AdminLoginResponse> {
  const data = await adminRequest<AdminLoginResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipUnauthorizedRedirect: true,
  });
  setAdminToken(data.access_token);
  return data;
}

export function getCurrentAdmin(): Promise<AdminMe> {
  return adminRequest<AdminMe>('/api/admin/auth/me');
}

export function getBookings(
  statusFilter?: BookingStatus | 'ALL'
): Promise<AdminBooking[]> {
  const query =
    statusFilter && statusFilter !== 'ALL'
      ? `?status_filter=${encodeURIComponent(statusFilter)}`
      : '';
  return adminRequest<AdminBooking[]>(`/api/admin/bookings${query}`);
}

export function getAdminBooking(bookingId: string): Promise<AdminBooking> {
  return adminRequest<AdminBooking>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}`
  );
}

export function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  adminNotes?: string
): Promise<AdminBooking> {
  const body: Record<string, string> = { status };
  if (adminNotes) {
    body.admin_notes = adminNotes;
  }
  return adminRequest<AdminBooking>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
}

export function listAdminCounselors(): Promise<AdminCounselor[]> {
  return adminRequest<AdminCounselor[]>('/api/admin/counselors');
}

export function createCounselor(
  payload: AdminCounselorPayload
): Promise<AdminCounselor> {
  return adminRequest<AdminCounselor>('/api/admin/counselors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCounselor(
  counselorId: string,
  payload: AdminCounselorUpdatePayload
): Promise<AdminCounselor> {
  return adminRequest<AdminCounselor>(
    `/api/admin/counselors/${encodeURIComponent(counselorId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export function listAdminSlots(counselorId: string): Promise<AdminCounselorSlot[]> {
  return adminRequest<AdminCounselorSlot[]>(
    `/api/admin/counselors/${encodeURIComponent(counselorId)}/slots`
  );
}

export function createSlot(
  counselorId: string,
  startsAt: string,
  endsAt: string
): Promise<AdminCounselorSlot> {
  return adminRequest<AdminCounselorSlot>(
    `/api/admin/counselors/${encodeURIComponent(counselorId)}/slots`,
    {
      method: 'POST',
      body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt }),
    }
  );
}

export function deleteSlot(counselorId: string, slotId: string): Promise<void> {
  return adminRequest<void>(
    `/api/admin/counselors/${encodeURIComponent(counselorId)}/slots/${encodeURIComponent(slotId)}`,
    { method: 'DELETE' }
  );
}