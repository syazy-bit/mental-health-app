/**
 * Owned screening-history client for "My Check-ins" (Phase 3C).
 *
 * Authenticated-only: history is account-scoped server-side (the backend
 * derives ownership exclusively from the verified JWT — there is no
 * `user_id` parameter and no session involved), so this module uses the
 * existing authenticated architecture (@/lib/auth-api `authenticatedRequest`:
 * in-memory Bearer token with exactly-once refresh-and-retry).
 *
 * Hard guarantees:
 * - Anonymous callers NEVER issue a network request (fail closed with a
 *   sign-in error before touching fetch).
 * - Authentication failures (401, refresh failure, network error) propagate
 *   to the caller. There is deliberately NO fallback to anonymous data —
 *   account history must never be mixed with, or replaced by, anonymous
 *   session content.
 */

import type { AuthStatus } from '@/components/auth/AuthProvider';
import type { StudentUser } from '@/lib/auth-types';
import { authenticatedRequest } from '@/lib/auth-api';
import type { ScreeningHistoryResponse } from '@/lib/types';

export interface CheckinAuth {
  status: AuthStatus;
  user: StudentUser | null;
}

export interface CheckinHistoryOptions {
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

export function isCheckinAuth(auth: CheckinAuth): auth is CheckinAuth & {
  status: 'authenticated';
  user: StudentUser;
} {
  return auth.status === 'authenticated' && auth.user !== null;
}

/**
 * Fetches the signed-in student's own screening history, newest first.
 * Throws (without any network request) when the caller is not authenticated.
 */
export async function fetchCheckinHistory(
  auth: CheckinAuth,
  options: CheckinHistoryOptions = {}
): Promise<ScreeningHistoryResponse> {
  if (!isCheckinAuth(auth)) {
    throw new Error('Sign in to view your check-in history.');
  }

  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(options.offset ?? 0, 0);
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return authenticatedRequest<ScreeningHistoryResponse>(
    `/api/screenings/history?${query.toString()}`,
    { method: 'GET' }
  );
}
