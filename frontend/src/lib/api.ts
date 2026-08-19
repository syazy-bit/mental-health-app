/**
 * API client for interacting with the FastAPI backend.
 * Provides typed, error-handled requests for sessions, chat, and screenings.
 */

import {
  Booking,
  BookingCreateRequest,
  BookingStatus,
  ChatMessageRequest,
  ChatMessageResponse,
  Counselor,
  CounselorSlot,
  ScreeningFollowUpRequest,
  ScreeningFollowUpResponse,
  ScreeningRequest,
  ScreeningResponse,
  SessionResponse,
} from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let retryAfter: number | undefined;

      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        if (retryHeader) {
          retryAfter = parseInt(retryHeader, 10);
        }
      }

      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default status message if body is not JSON
      }

      throw new ApiError(response.status, errorMessage, retryAfter);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Network error or backend is unavailable'
    );
  }
}

/**
 * Creates a new anonymous session.
 */
export async function createSession(language = 'en'): Promise<SessionResponse> {
  return request<SessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ language }),
  });
}

/**
 * Retrieves an existing anonymous session.
 */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  return request<SessionResponse>(`/api/sessions/${sessionId}`);
}

/**
 * Sends a message to the AI emotional support chat endpoint.
 */
export async function sendChatMessage(
  payload: ChatMessageRequest
): Promise<ChatMessageResponse> {
  return request<ChatMessageResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Submits a completed PHQ-9 or GAD-7 screening.
 */
export async function submitScreening(
  payload: ScreeningRequest
): Promise<ScreeningResponse> {
  return request<ScreeningResponse>('/api/screenings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Submits a safety follow-up action for a PHQ-9 positive Item 9 screening.
 */
export async function submitFollowup(
  payload: ScreeningFollowUpRequest
): Promise<ScreeningFollowUpResponse> {
  return request<ScreeningFollowUpResponse>('/api/screenings/followup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Lists active university counseling staff.
 */
export async function listCounselors(): Promise<Counselor[]> {
  return request<Counselor[]>('/api/counselors');
}

/**
 * Lists future available appointment times for a counselor.
 */
export async function listCounselorSlots(counselorId: string): Promise<CounselorSlot[]> {
  return request<CounselorSlot[]>(`/api/counselors/${counselorId}/slots`);
}

/**
 * Requests an appointment (anonymous-first; all contact fields optional).
 */
export async function createBooking(payload: BookingCreateRequest): Promise<Booking> {
  return request<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieves a booking. Ownership is proven by the matching session_id (if the
 * booking was linked to one) or the booking confirmation code.
 */
export async function getBooking(
  bookingId: string,
  params: { sessionId?: string; code?: string } = {}
): Promise<Booking> {
  const query = new URLSearchParams();
  if (params.sessionId) query.set('session_id', params.sessionId);
  if (params.code) query.set('code', params.code);
  const qs = query.toString();
  return request<Booking>(`/api/bookings/${bookingId}${qs ? `?${qs}` : ''}`);
}

/**
 * Cancels a booking (only PENDING or CONFIRMED bookings).
 */
export async function cancelBooking(
  bookingId: string,
  params: { sessionId?: string; code?: string } = {}
): Promise<Booking> {
  const query = new URLSearchParams();
  if (params.sessionId) query.set('session_id', params.sessionId);
  if (params.code) query.set('code', params.code);
  const qs = query.toString();
  return request<Booking>(`/api/bookings/${bookingId}/cancel${qs ? `?${qs}` : ''}`, {
    method: 'PATCH',
  });
}

/**
 * Looks up the latest appointment status using only the confirmation code
 * (anonymous; no account, no booking id). The backend returns only the status
 * and appointment identity — never student contact or internal data.
 */
export async function getBookingStatus(
  confirmationCode: string
): Promise<BookingStatus> {
  const code = encodeURIComponent(confirmationCode.trim().toUpperCase());
  return request<BookingStatus>(`/api/bookings/status/${code}`);
}
