/**
 * Central wellbeing request resolution (Phase 2C).
 *
 * ONE active wellbeing identity at a time. This module is the only place
 * allowed to pair a session ID with an authentication mode, so pages can
 * never independently mix them:
 *
 * - authenticated (signed in): active session = B (account-owned),
 *   every request carries the in-memory Bearer token.
 * - anonymous (signed out): active session = A (`mh_session_id`),
 *   requests carry NO Authorization header.
 *
 * Forbidden pairings this module never produces:
 * - anonymous session A + Bearer token,
 * - account session B without a Bearer token,
 * - silent fallback from B to A (or A to B) on failure — errors throw and
 *   callers fail closed.
 *
 * Token architecture is unchanged from Phase 1E: access tokens live only in
 * @/lib/auth-api module memory (read here via getter, never stored), the
 * refresh token stays in the backend HttpOnly cookie.
 */

import type { AuthStatus } from '@/components/auth/AuthProvider';
import type { StudentUser } from '@/lib/auth-types';
import { getAccessToken } from '@/lib/auth-api';
import { ensureSession } from '@/lib/session';
import { getStoredAccountSessionId, ensureAccountSession } from '@/lib/account-session';
import {
  ApiError,
  cancelBooking,
  createBooking,
  getBooking,
  sendChatMessage,
  submitFollowup,
  submitScreening,
} from '@/lib/api';
import type {
  Booking,
  BookingCreateRequest,
  ChatMessageResponse,
  ScreeningFollowUpResponse,
  ScreeningRequest,
  ScreeningResponse,
} from '@/lib/types';

export type WellbeingMode = 'authenticated' | 'anonymous';

export interface WellbeingAuth {
  status: AuthStatus;
  user: StudentUser | null;
}

export interface WellbeingContext {
  mode: WellbeingMode;
  /** Active session id: B when authenticated, A when anonymous. */
  sessionId: string;
  /** Authorization header for B, empty for A. */
  authHeaders: Record<string, string>;
}

export function isAuthenticated(auth: WellbeingAuth): auth is WellbeingAuth & {
  status: 'authenticated';
  user: StudentUser;
} {
  return auth.status === 'authenticated' && auth.user !== null;
}

/**
 * Resolves the active wellbeing session + auth pairing together.
 * B is branched lazily (only when an authenticated action actually runs).
 */
export async function ensureWellbeingContext(
  auth: WellbeingAuth,
  language = 'en'
): Promise<WellbeingContext> {
  if (isAuthenticated(auth)) {
    const sessionId = await ensureAccountSession({
      userId: auth.user.id,
      getToken: getAccessToken,
      language,
    });
    const token = getAccessToken();
    if (!token) {
      throw new ApiError(401, 'Your sign-in has expired. Please log in again.');
    }
    return {
      mode: 'authenticated',
      sessionId,
      authHeaders: { Authorization: `Bearer ${token}` },
    };
  }
  const sessionId = await ensureSession(language);
  return { mode: 'anonymous', sessionId, authHeaders: {} };
}

/** Mode indicator without creating sessions (for badges, copy, gating). */
export function getWellbeingMode(auth: WellbeingAuth): WellbeingMode {
  return isAuthenticated(auth) ? 'authenticated' : 'anonymous';
}

export async function sendWellbeingChatMessage(
  auth: WellbeingAuth,
  payload: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<ChatMessageResponse> {
  const ctx = await ensureWellbeingContext(auth);
  return sendChatMessage(
    {
      session_id: ctx.sessionId,
      message: payload.message,
      history: payload.history,
    },
    { headers: ctx.authHeaders }
  );
}

export async function submitWellbeingScreening(
  auth: WellbeingAuth,
  payload: { instrument: ScreeningRequest['instrument']; responses: number[] }
): Promise<ScreeningResponse> {
  const ctx = await ensureWellbeingContext(auth);
  return submitScreening(
    {
      session_id: ctx.sessionId,
      instrument: payload.instrument,
      responses: payload.responses,
    },
    { headers: ctx.authHeaders }
  );
}

/**
 * Follow-up continues the session that created the screening (ownership is
 * per-record, not per-current-mode): Bearer is attached only when the stored
 * screening session is my current account session B. Anything else travels
 * anonymously and fails closed (404/401) rather than mixing identities.
 */
export async function submitWellbeingFollowup(
  auth: WellbeingAuth,
  payload: { sessionId: string; screeningId: string; action: 'ESCALATE_CRISIS' | 'SUPPORTIVE_CARE' }
): Promise<ScreeningFollowUpResponse> {
  let headers: Record<string, string> = {};
  if (isAuthenticated(auth)) {
    const myB = getStoredAccountSessionId(auth.user.id);
    const token = getAccessToken();
    if (myB && myB === payload.sessionId && token) {
      headers = { Authorization: `Bearer ${token}` };
    }
  }
  return submitFollowup(
    {
      session_id: payload.sessionId,
      screening_id: payload.screeningId,
      action: payload.action,
    },
    { headers }
  );
}

export async function createWellbeingBooking(
  auth: WellbeingAuth,
  payload: Omit<BookingCreateRequest, 'session_id'> & { session_id?: string }
): Promise<Booking> {
  const ctx = await ensureWellbeingContext(auth);
  return createBooking(
    { ...payload, session_id: ctx.sessionId },
    { headers: ctx.authHeaders }
  );
}

/**
 * Booking retrieval/cancellation travels on the anonymous code path, plus
 * the Bearer token when signed in (no session_id is sent here, so no
 * session/header pairing is at stake). Owned bookings require the owner's
 * token; anonymous bookings ignore it server-side.
 */
function optionalBearerHeader(auth: WellbeingAuth): Record<string, string> {
  if (!isAuthenticated(auth)) return {};
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getWellbeingBooking(
  auth: WellbeingAuth,
  bookingId: string,
  params: { code?: string } = {}
): Promise<Booking> {
  return getBooking(bookingId, { code: params.code }, { headers: optionalBearerHeader(auth) });
}

export async function cancelWellbeingBooking(
  auth: WellbeingAuth,
  bookingId: string,
  params: { code?: string } = {}
): Promise<Booking> {
  return cancelBooking(bookingId, { code: params.code }, { headers: optionalBearerHeader(auth) });
}
