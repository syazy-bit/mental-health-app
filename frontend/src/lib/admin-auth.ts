/**
 * Admin JWT token storage for the university admin portal.
 *
 * Privacy/security: the access token is kept in sessionStorage (never
 * localStorage) and is never placed in URLs, query parameters, or logs. It is
 * cleared on logout and on any 401 response from the backend.
 */

const ADMIN_TOKEN_KEY = 'mh_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode etc.) - session simply won't persist.
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function hasAdminToken(): boolean {
  return getAdminToken() !== null;
}