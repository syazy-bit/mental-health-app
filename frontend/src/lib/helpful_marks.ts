/**
 * Owned helpful-marks client (My Story → What Helped).
 *
 * Authenticated-only: mark ownership comes exclusively from the backend
 * JWT — there is no `user_id` parameter and no session involved — so this
 * module uses the existing authenticated architecture (@/lib/auth-api
 * `authenticatedRequest`: in-memory Bearer token with exactly-once
 * refresh-and-retry).
 *
 * Hard guarantees (mirrors @/lib/moments and @/lib/checkins):
 * - Anonymous callers NEVER issue a network request (fail closed with a
 *   sign-in error before touching fetch).
 * - Authentication failures (401, refresh failure, network error) propagate
 *   to the caller. There is deliberately NO fallback to anonymous mode —
 *   account content must never be mixed with anonymous session content.
 * - Marks are registry ids plus timestamps only. Nothing here is logged,
 *   persisted locally, or placed in analytics/telemetry by this module.
 */

import type { AuthStatus } from '@/components/auth/AuthProvider';
import type { StudentUser } from '@/lib/auth-types';
import { authenticatedRequest } from '@/lib/auth-api';
import type {
  HelpfulMarkListResponse,
  HelpfulMarkResponse,
} from '@/lib/types';

export interface HelpfulMarkAuth {
  status: AuthStatus;
  user: StudentUser | null;
}

export const HELPFUL_MARKS_LIST_LIMIT = 50;

export function isHelpfulMarkAuth(auth: HelpfulMarkAuth): auth is HelpfulMarkAuth & {
  status: 'authenticated';
  user: StudentUser;
} {
  return auth.status === 'authenticated' && auth.user !== null;
}

function requireAuth(auth: HelpfulMarkAuth): void {
  if (!isHelpfulMarkAuth(auth)) {
    throw new Error('Sign in to remember what helped.');
  }
}

/**
 * Marks a tool as helpful (or re-marks it, refreshing its timestamp).
 * Sends only the registry id; the backend response is the source of truth.
 * There is deliberately no client-side record of mark history.
 */
export async function markHelpful(
  auth: HelpfulMarkAuth,
  toolId: string
): Promise<HelpfulMarkResponse> {
  requireAuth(auth);
  return authenticatedRequest<HelpfulMarkResponse>('/api/helpful-marks', {
    method: 'POST',
    body: JSON.stringify({ tool_id: toolId }),
  });
}

export interface HelpfulMarkListOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetches the signed-in student's own helpful marks, newest first.
 * Throws (without any network request) when the caller is not authenticated.
 */
export async function fetchHelpfulMarks(
  auth: HelpfulMarkAuth,
  options: HelpfulMarkListOptions = {}
): Promise<HelpfulMarkListResponse> {
  requireAuth(auth);

  const limit = Math.min(
    Math.max(options.limit ?? HELPFUL_MARKS_LIST_LIMIT, 1),
    HELPFUL_MARKS_LIST_LIMIT
  );
  const offset = Math.max(options.offset ?? 0, 0);
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return authenticatedRequest<HelpfulMarkListResponse>(
    `/api/helpful-marks?${query.toString()}`,
    { method: 'GET' }
  );
}

/**
 * Removes one owned helpful mark (backend hard-deletes it; absent rows
 * also answer 204). Throws AuthApiError on failure; callers must keep the
 * item visible unless this resolves.
 */
export async function removeHelpfulMark(
  auth: HelpfulMarkAuth,
  toolId: string
): Promise<void> {
  requireAuth(auth);
  await authenticatedRequest<void>(
    `/api/helpful-marks/${encodeURIComponent(toolId)}`,
    { method: 'DELETE' }
  );
}
