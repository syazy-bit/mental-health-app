/**
 * Anonymous session management for student mental health platform.
 * Privacy-first: strictly uses sessionStorage, never localStorage.
 * UUID is kept in memory/sessionStorage and never exposed in the UI.
 */

import { createSession } from '@/lib/api';

const SESSION_KEY = 'mh_session_id';
const SESSION_LANG_KEY = 'mh_session_lang';

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionId(id: string, lang = 'en'): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_LANG_KEY, lang);
  } catch (e) {
    console.warn('sessionStorage is not available:', e);
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_LANG_KEY);
  } catch {
    // ignore
  }
}

/**
 * Ensures an active anonymous session exists.
 * Returns existing session ID from sessionStorage or requests a new one from backend.
 */
export async function ensureSession(language = 'en'): Promise<string> {
  const existing = getStoredSessionId();
  if (existing) {
    return existing;
  }

  const session = await createSession(language);
  setStoredSessionId(session.id, session.language);
  return session.id;
}
