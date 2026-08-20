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

// --- M12 Analytics ---------------------------------------------------------
// The analytics payload is aggregate-only: it never contains student PII,
// booking contact details, session/booking IDs, or individual wellbeing data.

export interface AnalyticsPeriodCount {
  bucket: string;
  count: number;
}

export interface AnalyticsLanguageCount {
  language: string;
  count: number;
}

export interface AnalyticsInstrumentCount {
  instrument: string;
  count: number;
}

export interface AnalyticsSeverityCell {
  instrument: string;
  severity: string;
  count: number | null;
  suppressed: boolean;
}

export interface AnalyticsRiskLevelCell {
  risk_level: string;
  count: number | null;
  suppressed: boolean;
}

export interface AnalyticsRiskCategoryCell {
  category: string;
  count: number | null;
  suppressed: boolean;
}

export interface AnalyticsRiskTrendCell {
  bucket: string;
  risk_level: string;
  count: number | null;
  suppressed: boolean;
}

export interface AnalyticsBookingStatusCell {
  status: string;
  count: number;
}

export interface AnalyticsFunnelStage {
  stage: string;
  count: number;
}

export interface AnalyticsSuppressedRate {
  value: number | null;
  suppressed: boolean;
}

export interface AnalyticsOverview {
  total_sessions: number;
  total_screenings: number;
  total_safety_evaluations: number;
  total_bookings: number;
  active_counselors: number;
  total_counselor_slots: number;
  booking_completion_rate: number | null;
  booking_cancellation_rate: number | null;
}

export interface AnalyticsSession {
  over_time: AnalyticsPeriodCount[];
  language_distribution: AnalyticsLanguageCount[];
  average_messages_per_session: number | null;
}

export interface AnalyticsScreening {
  by_instrument: AnalyticsInstrumentCount[];
  severity_distribution: AnalyticsSeverityCell[];
  safety_flag_rate: AnalyticsSuppressedRate;
}

export interface AnalyticsSafety {
  risk_level_distribution: AnalyticsRiskLevelCell[];
  risk_category_distribution: AnalyticsRiskCategoryCell[];
  risk_trends: AnalyticsRiskTrendCell[];
}

export interface AnalyticsBooking {
  by_status: AnalyticsBookingStatusCell[];
  funnel: AnalyticsFunnelStage[];
  cancellation_rate: number | null;
  over_time: AnalyticsPeriodCount[];
}

export interface AnalyticsCounselor {
  counselor_id: string;
  name: string;
  is_active: boolean;
  total_slots: number;
  booked_slots: number;
  completed_bookings: number;
  pending_bookings: number;
  cancelled_bookings: number;
  utilization_rate: number | null;
}

export interface AnalyticsDashboard {
  generated_at: string;
  overview: AnalyticsOverview;
  sessions: AnalyticsSession;
  screenings: AnalyticsScreening;
  safety: AnalyticsSafety;
  bookings: AnalyticsBooking;
  counselors: AnalyticsCounselor[];
}