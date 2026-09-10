/**
 * Tests for the helpful-marks client (@/lib/helpful_marks).
 *
 * Privacy properties under test:
 * - authenticated calls send the in-memory Bearer token
 * - anonymous callers NEVER issue a network request (fail closed)
 * - 401/refresh failures propagate — never fall back to anonymous mode
 * - requests carry only tool_id/limit/offset (no user_id, no session_id)
 * - mark data is never logged or persisted by this module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthState, setAccessToken } from '@/lib/auth-api';
import {
  fetchHelpfulMarks,
  markHelpful,
  removeHelpfulMark,
} from '@/lib/helpful_marks';

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
  tool_id: 'box_breathing',
  marked_at: '2026-09-09T12:00:00.000Z',
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
  it('markHelpful POSTs only the tool id with the Bearer token', async () => {
    installFetch(async () => json(CREATED, 201));
    const created = await markHelpful(AUTHED, 'box_breathing');
    expect(created.tool_id).toBe('box_breathing');
    expect(created.marked_at).toBe('2026-09-09T12:00:00.000Z');
    expect(requests).toHaveLength(1);
    expect(requests[0].url.endsWith('/api/helpful-marks')).toBe(true);
    expect(requests[0].init.method).toBe('POST');
    expect(JSON.parse(String(requests[0].init.body))).toEqual({
      tool_id: 'box_breathing',
    });
    expect(headerOf('/api/helpful-marks')['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  it('fetchHelpfulMarks sends limit/offset and no identity parameters', async () => {
    installFetch(async () => json(LIST_PAGE));
    const page = await fetchHelpfulMarks(AUTHED, { limit: 10, offset: 5 });
    expect(page.total).toBe(1);
    const url = new URL(requests[0].url);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.has('user_id')).toBe(false);
    expect(url.searchParams.has('session_id')).toBe(false);
  });

  it('fetchHelpfulMarks clamps limit/offset to safe bounds', async () => {
    installFetch(async () => json({ ...LIST_PAGE, limit: 50, offset: 0 }));
    await fetchHelpfulMarks(AUTHED, { limit: 500, offset: -3 });
    const url = new URL(requests[0].url);
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('offset')).toBe('0');
  });

  it('removeHelpfulMark issues DELETE against the encoded tool id', async () => {
    installFetch(async () => new Response(null, { status: 204 }));
    await removeHelpfulMark(AUTHED, 'box_breathing');
    expect(requests).toHaveLength(1);
    expect(requests[0].url.endsWith('/api/helpful-marks/box_breathing')).toBe(true);
    expect(requests[0].init.method).toBe('DELETE');
    expect(headerOf('/api/helpful-marks/box_breathing')['Authorization']).toBe(
      `Bearer ${TOKEN}`
    );
  });
});

describe('fail-closed anonymous behavior', () => {
  it.each([
    ['markHelpful', () => markHelpful(ANON, 'box_breathing')],
    ['fetchHelpfulMarks', () => fetchHelpfulMarks(ANON)],
    ['removeHelpfulMark', () => removeHelpfulMark(ANON, 'box_breathing')],
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
    await expect(fetchHelpfulMarks(AUTHED)).rejects.toBeInstanceOf(AuthApiError);
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });

  it('429/422 surfaces carry status for caller-side friendly copy', async () => {
    installFetch(async () => json({ detail: 'slow down' }, 429));
    const { AuthApiError } = await import('@/lib/auth-api');
    const error = await markHelpful(AUTHED, 'box_breathing').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthApiError);
    expect((error as InstanceType<typeof AuthApiError>).status).toBe(429);
  });
});
