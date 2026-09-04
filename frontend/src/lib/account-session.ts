/**
 * Authenticated account-session management (Phase 2C).
 *
 * Park-and-branch model: the anonymous session (`mh_session_id`, owned by
 * @/lib/session) is NEVER overwritten, mutated, or claimed here. The
 * account-owned session B lives under a separate per-user key so:
 * - login never destroys or converts the parked anonymous session A,
 * - different users on one browser profile can never share a B pointer,
 * - logout simply stops using B (the backend row stays owned; nothing is
 *   deleted, converted, or unlinked client-side).
 *
 * The session ID is an opaque identifier, never a credential: knowing B
 * without the account's Bearer token authorizes nothing (backend-enforced).
 * Access tokens stay in @/lib/auth-api module memory; this module only
 * receives a token getter and never persists tokens itself.
 */

import { ApiError, createSession, getSession } from '@/lib/api';

const ACCOUNT_SESSION_KEY_PREFIX = 'mh_account_session:';

function keyFor(userId: string): string {
  return `${ACCOUNT_SESSION_KEY_PREFIX}${userId}`;
}

export function getStoredAccountSessionId(userId: string): string | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    return sessionStorage.getItem(keyFor(userId));
  } catch {
    return null;
  }
}

export function setStoredAccountSessionId(userId: string, sessionId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.setItem(keyFor(userId), sessionId);
  } catch (e) {
    console.warn('sessionStorage is not available:', e);
  }
}

export function clearStoredAccountSessionId(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}

/** Single-flight ensure per user so concurrent tabs/actions create only one B. */
const inflightEnsures = new Map<string, Promise<string>>();

export function __resetAccountSessionInflightForTests(): void {
  inflightEnsures.clear();
}

export interface AccountSessionDeps {
  /** Authenticated user's id (JWT sub, from /me — never client-invented). */
  userId: string;
  /** Returns the in-memory access token, or null when unavailable. */
  getToken: () => string | null;
  language?: string;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Ensures the authenticated account session B for `userId`.
 *
 * - Resumes the stored B pointer after validating ownership through the
 *   backend (GET returns 200 only for the authenticated owner).
 * - A stale pointer (unknown / deleted / owned-by-other session, expired
 *   token) is discarded and a fresh B is branched lazily.
 * - The anonymous session A is never read, written, or promoted here.
 * - Never falls back to A: failures throw so callers fail closed instead
 *   of silently sending an authenticated request against the wrong session.
 */
export async function ensureAccountSession(deps: AccountSessionDeps): Promise<string> {
  const { userId, getToken, language = 'en' } = deps;
  if (!userId) {
    throw new Error('An authenticated user is required for an account session.');
  }

  const existingInflight = inflightEnsures.get(userId);
  if (existingInflight) return existingInflight;

  const task = (async (): Promise<string> => {
    const token = getToken();
    if (!token) {
      throw new Error('Your sign-in has expired. Please log in again.');
    }

    const stored = getStoredAccountSessionId(userId);
    if (stored) {
      try {
        await getSession(stored, { headers: authHeaders(token) });
        return stored;
      } catch (error) {
        // Only a definitive 404 proves the stored pointer is stale
        // (unknown / deleted session). A 401 means the *token* is bad while
        // B may still be valid; network/5xx/other errors prove nothing about
        // B — so the pointer is preserved and the failure propagates
        // (fail closed, no anonymous fallback, no replacement B).
        if (error instanceof ApiError && error.status === 404) {
          clearStoredAccountSessionId(userId);
        } else {
          throw error;
        }
      }
    }

    const freshToken = getToken();
    if (!freshToken) {
      throw new Error('Your sign-in has expired. Please log in again.');
    }
    const created = await createSession(language, { headers: authHeaders(freshToken) });
    setStoredAccountSessionId(userId, created.id);
    return created.id;
  })();

  inflightEnsures.set(userId, task);
  try {
    return await task;
  } finally {
    inflightEnsures.delete(userId);
  }
}
