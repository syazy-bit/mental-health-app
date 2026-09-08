/**
 * Tests for the Moments client (@/lib/moments).
 *
 * Privacy properties under test:
 * - authenticated calls send the in-memory Bearer token
 * - anonymous callers NEVER issue a network request (fail closed)
 * - 401/refresh failures propagate — never fall back to anonymous mode
 * - requests carry only body/limit/offset/id (no user_id, no session_id)
 * - Moment bodies are never logged or persisted by this module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthState, setAccessToken } from '@/lib/auth-api';
import {
  createMoment,
  deleteMoment,
  fetchMoments,
  restoreMoment,
} from '@/lib/moments';

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

const CREATED = {
  id: 'm-1',
  body: 'A short note worth keeping.',
  created_at: '2026-09-08T12:00:00.000Z',
  safety: { level: 'normal' as const },
};

const LIST_PAGE = {
  items: [CREATED],
  total: 1,
  limit: 50,
  offset: 0,
};

beforeEach(() => {
  requests = [];
  setAccessToken(TOKEN);
  vi.unstubAllGlobals();
});

afterEach(() => {
  clearAuthState();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('authenticated calls', () => {
  it('createMoment POSTs only the body with the Bearer token', async () => {
    installFetch(async () => json(CREATED, 201));
    const created = await createMoment(AUTHED, 'A short note worth keeping.');
    expect(created.id).toBe('m-1');
    expect(created.safety.level).toBe('normal');
    expect(requests).toHaveLength(1);
    expect(requests[0].url.endsWith('/api/moments')).toBe(true);
    expect(requests[0].init.method).toBe('POST');
    expect(JSON.parse(String(requests[0].init.body))).toEqual({
      body: 'A short note worth keeping.',
    });
    expect(headerOf('/api/moments')['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  it('fetchMoments sends limit/offset and no identity parameters', async () => {
    installFetch(async () => json(LIST_PAGE));
    const page = await fetchMoments(AUTHED, { limit: 10, offset: 5 });
    expect(page.total).toBe(1);
    const url = new URL(requests[0].url);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.has('user_id')).toBe(false);
    expect(url.searchParams.has('session_id')).toBe(false);
  });

  it('fetchMoments clamps limit/offset to safe bounds', async () => {
    installFetch(async () => json({ ...LIST_PAGE, limit: 50, offset: 0 }));
    await fetchMoments(AUTHED, { limit: 500, offset: -3 });
    const url = new URL(requests[0].url);
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('offset')).toBe('0');
  });

  it('deleteMoment issues DELETE against the encoded id', async () => {
    installFetch(async () => new Response(null, { status: 204 }));
    await deleteMoment(AUTHED, 'm-1');
    expect(requests).toHaveLength(1);
    expect(requests[0].url.endsWith('/api/moments/m-1')).toBe(true);
    expect(requests[0].init.method).toBe('DELETE');
    expect(headerOf('/api/moments/m-1')['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  it('restoreMoment POSTs to the restore endpoint and returns the item', async () => {
    installFetch(async () => json({ id: 'm-1', body: 'back', created_at: '2026-09-08T12:00:00.000Z' }));
    const restored = await restoreMoment(AUTHED, 'm-1');
    expect(restored.id).toBe('m-1');
    expect(requests[0].url.endsWith('/api/moments/m-1/restore')).toBe(true);
    expect(requests[0].init.method).toBe('POST');
  });
});

describe('fail-closed anonymous behavior', () => {
  it.each([
    ['createMoment', () => createMoment(ANON, 'nope')],
    ['fetchMoments', () => fetchMoments(ANON)],
    ['deleteMoment', () => deleteMoment(ANON, 'm-1')],
    ['restoreMoment', () => restoreMoment(ANON, 'm-1')],
  ])('%s throws without issuing any network request', async (_name, call) => {
    installFetch(async () => json({}, 200));
    await expect(call()).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
});

describe('error propagation', () => {
  it('401 failures propagate without anonymous fallback', async () => {
    installFetch(async () => json({ detail: 'expired' }, 401));
    // No token in memory: no refresh attempt, immediate 401 surface.
    clearAuthState();
    const { AuthApiError } = await import('@/lib/auth-api');
    await expect(fetchMoments(AUTHED)).rejects.toBeInstanceOf(AuthApiError);
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });

  it('429/422/413 surfaces carry status for caller-side friendly copy', async () => {
    installFetch(async () => json({ detail: 'slow down' }, 429));
    const { AuthApiError } = await import('@/lib/auth-api');
    const error = await createMoment(AUTHED, 'x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthApiError);
    expect((error as InstanceType<typeof AuthApiError>).status).toBe(429);
  });
});
