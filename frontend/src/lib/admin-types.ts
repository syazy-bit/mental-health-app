/**
 * Admin portal domain types.
 *
 * This module is intentionally isolated from the student-facing types in
 * `@/lib/types.ts`. The admin UI must never fetch or render student wellbeing
 * data (chat, screening, risk, safety, session_id).
 */

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminMe {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface AdminBooking {
  id: string;
  confirmation_code: string;
  status: BookingStatus;
  student_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  slot: {
    id: string;
    starts_at: string;
    ends_at: string;
  };
  counselor: {
    id: string;
    name: string;
    title: string;
  };
  slot_id: string;
  admin_notes: string | null;
}

export interface AdminCounselor {
  id: string;
  name: string;
  title: string;
  areas_of_support: string[];
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCounselorPayload {
  name: string;
  title: string;
  areas_of_support: string[];
  bio?: string;
  is_active: boolean;
}

export interface AdminCounselorUpdatePayload {
  name?: string;
  title?: string;
  areas_of_support?: string[];
  bio?: string;
  is_active?: boolean;
}

export interface AdminCounselorSlot {
  id: string;
  counselor_id: string;
  starts_at: string;
  ends_at: string;
  booking_status: BookingStatus | null;
}