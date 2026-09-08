/**
 * Owned Moments client (My Story: user-authored private notes).
 *
 * Authenticated-only: Moment ownership comes exclusively from the backend
 * JWT — there is no `user_id` parameter and no session involved — so this
 * module uses the existing authenticated architecture (@/lib/auth-api
 * `authenticatedRequest`: in-memory Bearer token with exactly-once
 * refresh-and-retry).
 *
 * Hard guarantees (mirrors @/lib/checkins):
 * - Anonymous callers NEVER issue a network request (fail closed with a
 *   sign-in error before touching fetch).
 * - Authentication failures (401, refresh failure, network error) propagate
 *   to the caller. There is deliberately NO fallback to anonymous mode —
 *   account content must never be mixed with anonymous session content.
 * - Moment bodies are never logged, never persisted locally, and never
 *   placed in analytics/telemetry by this module.
 */

import type { AuthStatus } from '@/components/auth/AuthProvider';
import type { StudentUser } from '@/lib/auth-types';
import { authenticatedRequest } from '@/lib/auth-api';
import type {
  MomentCreateResponse,
  MomentItem,
  MomentListResponse,
} from '@/lib/types';

export interface MomentAuth {
  status: AuthStatus;
  user: StudentUser | null;
}

export const MOMENT_MAX_LENGTH = 500;
export const MOMENT_LIST_LIMIT = 50;

export function isMomentAuth(auth: MomentAuth): auth is MomentAuth & {
  status: 'authenticated';
  user: StudentUser;
} {
  return auth.status === 'authenticated' && auth.user !== null;
}

function requireAuth(auth: MomentAuth): void {
  if (!isMomentAuth(auth)) {
    throw new Error('Sign in to view your moments.');
  }
}

/**
 * Saves a Moment the student explicitly chose to remember.
 * The backend response (including its server-generated id) is the source
 * of truth; the client never invents ids. The transient `safety.level` is
 * returned for immediate support UI only and must not be stored as profile
 * data by callers.
 */
export async function createMoment(
  auth: MomentAuth,
  body: string
): Promise<MomentCreateResponse> {
  requireAuth(auth);
  return authenticatedRequest<MomentCreateResponse>('/api/moments', {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export interface MomentListOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetches the signed-in student's own Moments, newest first.
 * Throws (without any network request) when the caller is not authenticated.
 */
export async function fetchMoments(
  auth: MomentAuth,
  options: MomentListOptions = {}
): Promise<MomentListResponse> {
  requireAuth(auth);

  const limit = Math.min(
    Math.max(options.limit ?? MOMENT_LIST_LIMIT, 1),
    MOMENT_LIST_LIMIT
  );
  const offset = Math.max(options.offset ?? 0, 0);
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return authenticatedRequest<MomentListResponse>(
    `/api/moments?${query.toString()}`,
    { method: 'GET' }
  );
}

/**
 * Deletes a Moment immediately (backend tombstones it and opens the
 * 5-second restore window). Throws AuthApiError on failure; callers must
 * keep the Moment visible unless this resolves.
 */
export async function deleteMoment(
  auth: MomentAuth,
  id: string
): Promise<void> {
  requireAuth(auth);
  await authenticatedRequest<void>(
    `/api/moments/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

/**
 * Restores a Moment inside the backend's 5-second recovery window.
 * A 404 means the window is gone ("already permanently deleted") and must
 * be handled quietly — never as a scary technical error.
 */
export async function restoreMoment(
  auth: MomentAuth,
  id: string
): Promise<MomentItem> {
  requireAuth(auth);
  return authenticatedRequest<MomentItem>(
    `/api/moments/${encodeURIComponent(id)}/restore`,
    { method: 'POST' }
  );
}
