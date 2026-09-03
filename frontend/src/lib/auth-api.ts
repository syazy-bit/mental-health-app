/**
 * Student authentication API client.
 *
 * This is the ONLY module that touches student auth credentials. It talks to
 * the Phase 1B backend endpoints under /api/auth/* and enforces the token
 * architecture:
 *
 * - Access token: short-lived JWT, kept ONLY in runtime module memory. It is
 *   never written to localStorage, sessionStorage, IndexedDB, cookies,
 *   URLs, or any persisted state. It is attached as
 *   `Authorization: Bearer <token>` on authenticated requests.
 * - Refresh token: owned exclusively by the backend HttpOnly cookie. This
 *   module never reads it (no `document.cookie`), never stores it, and never
 *   returns it. `credentials: 'include'` lets the browser send it on the
 *   cookie-scoped /api/auth/* paths.
 *
 * Refresh behavior:
 * - A 401 on an authenticated request triggers exactly one shared in-flight
 *   refresh (concurrent callers await the same promise — critical because
 *   backend refresh tokens rotate and parallel refreshes would trip reuse
 *   detection). The original request is retried once with the new token.
 * - If refresh fails, in-memory auth state is cleared and callers observe a
 *   401. No retry loops: a second 401 is never followed.
 *
 * Errors surface as AuthApiError (status + message). Tokens, passwords, and
 * Authorization headers are never logged here.
 */

import type {
  StudentLoginPayload,
  StudentRegisterPayload,
  StudentTokenResponse,
  StudentUser,
} from '@/lib/auth-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/** In-memory access token. Module scope = runtime memory only, never persisted. */
let accessToken: string | null = null;

/** Shared in-flight refresh promise so concurrent 401s trigger ONE refresh. */
let inflightRefresh: Promise<string> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAuthState(): void {
  accessToken = null;
  inflightRefresh = null;
}

function parseErrorMessage(status: number, body: unknown): string {
  if (body !== null && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.length > 0) return detail;
    if (Array.isArray(detail)) {
      const first = detail.find(
        (item): item is { msg?: unknown } =>
          typeof item === 'object' && item !== null && 'msg' in item
      );
      if (first && typeof first.msg === 'string') return first.msg;
    }
  }
  if (status === 0) return 'Unable to reach the server. Please check your connection.';
  return `Request failed with status ${status}`;
}

async function readJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

interface AuthRequestOptions extends RequestInit {
  /** Attach the in-memory access token when present. */
  authenticated?: boolean;
}

async function authRequest<T>(
  endpoint: string,
  options: AuthRequestOptions = {}
): Promise<T> {
  const { authenticated = false, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };
  if (authenticated && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      // Always include cookies: the refresh/logout endpoints rely on the
      // backend HttpOnly cookie. Harmless for the other auth endpoints.
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new AuthApiError(0, 'Unable to reach the server. Please check your connection.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new AuthApiError(response.status, parseErrorMessage(response.status, body));
  }
  return body as T;
}

/**
 * Exchange the HttpOnly refresh cookie for a new access token.
 * Concurrent callers share a single in-flight request.
 */
export function refreshAccessToken(): Promise<string> {
  if (!inflightRefresh) {
    inflightRefresh = authRequest<StudentTokenResponse>('/api/auth/refresh', {
      method: 'POST',
    }).then(
      (tokenResponse) => {
        accessToken = tokenResponse.access_token;
        inflightRefresh = null;
        return tokenResponse.access_token;
      },
      (error: unknown) => {
        inflightRefresh = null;
        clearAuthState();
        throw error;
      }
    );
  }
  return inflightRefresh;
}

/**
 * Authenticated request with exactly-once refresh-and-retry.
 * Retries the original request a single time after a successful refresh;
 * a second 401 (or refresh failure) clears auth state and throws — no loops.
 */
export async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const hadToken = accessToken !== null;
  try {
    return await authRequest<T>(endpoint, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.status !== 401 || !hadToken) {
      throw error;
    }
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      throw refreshError;
    }
    return authRequest<T>(endpoint, { ...options, authenticated: true });
  }
}

export async function registerStudent(
  payload: StudentRegisterPayload
): Promise<StudentTokenResponse> {
  const tokenResponse = await authRequest<StudentTokenResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      ...(payload.display_name ? { display_name: payload.display_name } : {}),
    }),
  });
  accessToken = tokenResponse.access_token;
  return tokenResponse;
}

export async function loginStudent(
  payload: StudentLoginPayload
): Promise<StudentTokenResponse> {
  const tokenResponse = await authRequest<StudentTokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
  accessToken = tokenResponse.access_token;
  return tokenResponse;
}

export async function fetchCurrentUser(): Promise<StudentUser> {
  return authenticatedRequest<StudentUser>('/api/auth/me', { method: 'GET' });
}

export async function logoutStudent(): Promise<void> {
  try {
    await authRequest<void>('/api/auth/logout', { method: 'POST' });
  } catch {
    // Logout is best-effort: an expired/revoked token must not block the
    // client from clearing its in-memory state.
  } finally {
    clearAuthState();
  }
}
