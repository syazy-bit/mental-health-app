/**
 * Tests for the Phase 3C check-ins client (@/lib/checkins).
 *
 * Privacy properties under test:
 * - authenticated history loads and sends the in-memory Bearer token
 * - anonymous callers NEVER issue a network request (fail closed)
 * - 401/refresh failures propagate — never fall back to anonymous data
 * - requests carry only limit/offset (no session_id, no user_id, no answers)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthState, setAccessToken } from '@/lib/auth-api';
import { fetchCheckinHistory } from '@/lib/checkins';

interface RecordedRequest {
  url: string;
  init: RequestInit;
}

let requests: RecordedRequest[];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    return impl(String(url), init);
  });
  vi.stubGlobal('fetch', fetchMock);
}

function headerOf(urlSuffix: string, occurrence = 0): Record<string, string> {
  const matches = requests.filter((r) => r.url.split('?')[0].endsWith(urlSuffix));
  return (matches[occurrence]?.init.headers as Record<string, string>) ?? {};
}

const TOKEN = 'memory-access-token';
const USER = { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' };
const AUTHED = { status: 'authenticated' as const, user: USER };
const ANON = { status: 'anonymous' as const, user: null };

const HISTORY_PAGE = {
  items: [
    {
      id: 'h-1',
      instrument: 'PHQ9',
      total_score: 12,
      severity: 'Moderate',
      safety_flag: false,
      item9_score: 0,
      created_at: '2026-09-01T12:00:00.000Z',
    },
    {
      id: 'h-2',
      instrument: 'GAD7',
      total_score: 5,
      severity: 'Mild',
      safety_flag: false,
      item9_score: null,
      created_at: '2026-08-20T12:00:00.000Z',
    },
  ],
  total: 2,
  limit: 50,
  offset: 0,
};

beforeEach(() => {
  requests = [];
  clearAuthState();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('authenticated history loads', () => {
  it('returns the owned history page', async () => {
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.includes('/api/screenings/history')) return json(HISTORY_PAGE);
      throw new Error(`unexpected ${url}`);
    });

    const page = await fetchCheckinHistory(AUTHED);
    expect(page.items).toHaveLength(2);
    expect(page.items[0].instrument).toBe('PHQ9');
    expect(page.total).toBe(2);
  });

  it('sends the Bearer token (existing authenticated architecture)', async () => {
    setAccessToken(TOKEN);
    installFetch(async () => json(HISTORY_PAGE));

    await fetchCheckinHistory(AUTHED);
    expect(headerOf('/api/screenings/history')['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  it('requests with GET + limit/offset only (no session_id, user_id, or answers)', async () => {
    setAccessToken(TOKEN);
    installFetch(async () => json(HISTORY_PAGE));

    await fetchCheckinHistory(AUTHED, { limit: 20, offset: 5 });
    expect(requests).toHaveLength(1);
    const [call] = requests;
    expect(call.init.method).toBe('GET');
    const url = new URL(call.url);
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.has('session_id')).toBe(false);
    expect(url.searchParams.has('user_id')).toBe(false);
    expect(url.searchParams.has('instrument')).toBe(false);
  });

  it('resolves empty history without error', async () => {
    setAccessToken(TOKEN);
    installFetch(async () => json({ items: [], total: 0, limit: 50, offset: 0 }));

    const page = await fetchCheckinHistory(AUTHED);
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });
});

describe('anonymous callers never request account history', () => {
  it('throws before any network request when anonymous', async () => {
    const fetchMock = vi.fn(async () => json(HISTORY_PAGE));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCheckinHistory(ANON)).rejects.toThrow('Sign in');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws before any network request while auth is still initializing', async () => {
    const fetchMock = vi.fn(async () => json(HISTORY_PAGE));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchCheckinHistory({ status: 'initializing', user: null })
    ).rejects.toThrow('Sign in');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('401 behavior (no anonymous fallback)', () => {
  it('propagates after a failed refresh without touching anonymous endpoints', async () => {
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.includes('/api/auth/refresh')) return json({ detail: 'revoked' }, 401);
      if (url.includes('/api/screenings/history')) {
        return json({ detail: 'Could not validate credentials' }, 401);
      }
      throw new Error(`unexpected ${url}`);
    });

    await expect(fetchCheckinHistory(AUTHED)).rejects.toMatchObject({ status: 401 });

    const paths = requests.map((r) => r.url.split('?')[0]);
    // Exactly one history attempt + one refresh attempt; nothing else.
    expect(paths.filter((p) => p.endsWith('/api/screenings/history'))).toHaveLength(1);
    expect(paths.filter((p) => p.endsWith('/api/auth/refresh'))).toHaveLength(1);
    // No fallback to anonymous session or submission endpoints.
    expect(paths.some((p) => p.includes('/api/sessions'))).toBe(false);
    expect(requests.filter((r) => r.init.method === 'POST' && r.url.endsWith('/api/screenings'))).toHaveLength(0);
  });

  it('retries once with the refreshed token and resolves', async () => {
    setAccessToken(TOKEN);
    installFetch(async (url, init) => {
      if (url.includes('/api/auth/refresh')) {
        return json({ access_token: 'fresh-token', token_type: 'bearer', expires_in: 900 });
      }
      if (url.includes('/api/screenings/history')) {
        const auth = (init?.headers as Record<string, string>)['Authorization'];
        if (auth === 'Bearer fresh-token') return json(HISTORY_PAGE);
        return json({ detail: 'Could not validate credentials' }, 401);
      }
      throw new Error(`unexpected ${url}`);
    });

    const page = await fetchCheckinHistory(AUTHED);
    expect(page.items).toHaveLength(2);
    expect(headerOf('/api/screenings/history', 1)['Authorization']).toBe('Bearer fresh-token');
  });
});
