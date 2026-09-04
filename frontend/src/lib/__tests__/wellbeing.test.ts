/**
 * Tests for Phase 2C wellbeing session resolution (@/lib/wellbeing,
 * @/lib/account-session).
 *
 * Security properties under test:
 * - ONE active wellbeing identity: B + Bearer when signed in, A alone when not
 * - anonymous session A is parked, never overwritten, mutated, or promoted
 * - B is branched lazily, validated before resume, namespaced per user
 * - no silent fallback between modes (failures throw, no quiet retry as anon)
 * - access token stays in module memory; session IDs are not credentials
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthState, setAccessToken } from '@/lib/auth-api';
import {
  __resetAccountSessionInflightForTests,
  clearStoredAccountSessionId,
  ensureAccountSession,
  getStoredAccountSessionId,
  setStoredAccountSessionId,
} from '@/lib/account-session';
import { getStoredSessionId, setStoredSessionId } from '@/lib/session';
import {
  cancelWellbeingBooking,
  createWellbeingBooking,
  ensureWellbeingContext,
  getWellbeingBooking,
  getWellbeingMode,
  sendWellbeingChatMessage,
  submitWellbeingFollowup,
  submitWellbeingScreening,
} from '@/lib/wellbeing';

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

function pathOf(url: string): string {
  return url.split('?')[0];
}

function headerOf(urlSuffix: string, occurrence = 0): Record<string, string> {
  const matches = requests.filter((r) => pathOf(r.url).endsWith(urlSuffix));
  return (matches[occurrence]?.init.headers as Record<string, string>) ?? {};
}

function bodyOf(urlSuffix: string, occurrence = 0): Record<string, unknown> {
  const matches = requests.filter((r) => pathOf(r.url).endsWith(urlSuffix));
  return JSON.parse(String(matches[occurrence]?.init.body ?? '{}'));
}

function countCalls(urlInfix: string): number {
  return requests.filter((r) => pathOf(r.url).includes(urlInfix)).length;
}

const TOKEN = 'memory-access-token';
const USER = { id: 'u-1', email: 's@example.com', display_name: null, created_at: '2026-01-01' };
const AUTHED = { status: 'authenticated' as const, user: USER };
const ANON = { status: 'anonymous' as const, user: null };

const SESSION_A = { id: 'session-aaa', language: 'en', created_at: 't', updated_at: 't' };
const SESSION_B = { id: 'session-bbb', language: 'en', created_at: 't', updated_at: 't' };

beforeEach(() => {
  requests = [];
  clearAuthState();
  sessionStorage.clear();
  localStorage.clear();
  __resetAccountSessionInflightForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('mode indicator', () => {
  it('reports anonymous vs authenticated without touching the network', () => {
    installFetch(async () => json({}));
    expect(getWellbeingMode(ANON)).toBe('anonymous');
    expect(getWellbeingMode(AUTHED)).toBe('authenticated');
    expect(requests).toHaveLength(0);
  });
});

describe('anonymous mode', () => {
  it('uses stored A with no Authorization header', async () => {
    setStoredSessionId('session-aaa');
    installFetch(async (url) => {
      if (url.endsWith('/api/chat/message')) {
        return json({ session_id: 'session-aaa', message_index: 1, risk_level: 'NORMAL', category: 'x', response: 'hi', is_crisis: false, language: 'en' });
      }
      throw new Error(`unexpected ${url}`);
    });

    const ctx = await ensureWellbeingContext(ANON);
    expect(ctx).toEqual({ mode: 'anonymous', sessionId: 'session-aaa', authHeaders: {} });

    await sendWellbeingChatMessage(ANON, { message: 'hello' });
    expect(headerOf('/api/chat/message')['Authorization']).toBeUndefined();
    expect(bodyOf('/api/chat/message')['session_id']).toBe('session-aaa');
  });

  it('creates A lazily and keeps working without auth', async () => {
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions')) return json(SESSION_A, 201);
      if (url.endsWith('/api/screenings')) {
        return json({ id: 'scr-1', session_id: 'session-aaa', instrument: 'GAD7', total_score: 3, severity: 'Minimal', safety_flag: false, item9_score: 0, created_at: 't' }, 201);
      }
      throw new Error(`unexpected ${url}`);
    });

    await submitWellbeingScreening(ANON, { instrument: 'GAD7', responses: [0, 0, 0, 0, 0, 0, 0] });
    expect(headerOf('/api/screenings')['Authorization']).toBeUndefined();
    expect(bodyOf('/api/screenings')['session_id']).toBe('session-aaa');
    expect(getStoredSessionId()).toBe('session-aaa');
  });
});

describe('login transition (park-and-branch)', () => {
  it('does not overwrite A and branches a distinct B on first action', async () => {
    setStoredSessionId('session-aaa');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions') && !url.includes('/api/sessions/')) return json(SESSION_B, 201);
      if (url.endsWith('/api/chat/message')) {
        return json({ session_id: 'session-bbb', message_index: 1, risk_level: 'NORMAL', category: 'x', response: 'hi', is_crisis: false, language: 'en' });
      }
      throw new Error(`unexpected ${url}`);
    });

    await sendWellbeingChatMessage(AUTHED, { message: 'hello' });

    // A parked intact, B stored separately under this user.
    expect(getStoredSessionId()).toBe('session-aaa');
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
    expect(headerOf('/api/chat/message')['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(bodyOf('/api/chat/message')['session_id']).toBe('session-bbb');
  });

  it('creates B lazily: no session request until a wellbeing action runs', async () => {
    setAccessToken(TOKEN);
    installFetch(async () => json(SESSION_B, 201));
    expect(countCalls('/api/sessions')).toBe(0);
    await ensureWellbeingContext(AUTHED);
    expect(countCalls('/api/sessions')).toBe(1);
  });
});

describe('re-login resume', () => {
  it('resumes a valid B without creating a new session', async () => {
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async (url, init) => {
      if (url.endsWith('/api/sessions/session-bbb')) {
        expect((init?.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`);
        return json(SESSION_B);
      }
      throw new Error(`unexpected ${url}`);
    });

    const ctx = await ensureWellbeingContext(AUTHED);
    expect(ctx.sessionId).toBe('session-bbb');
    expect(countCalls('/api/sessions')).toBe(1); // validate only, no create
  });

  it('discards a stale B pointer and branches fresh (never promotes A)', async () => {
    setStoredSessionId('session-aaa');
    setStoredAccountSessionId('u-1', 'session-stale');
    setAccessToken(TOKEN);
    installFetch(async (url, init) => {
      if (url.endsWith('/api/sessions/session-stale')) return json({ detail: 'Session not found' }, 404);
      if (url.endsWith('/api/sessions')) {
        expect((init?.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`);
        return json(SESSION_B, 201);
      }
      throw new Error(`unexpected ${url}`);
    });

    const ctx = await ensureWellbeingContext(AUTHED);
    expect(ctx.sessionId).toBe('session-bbb');
    expect(getStoredSessionId()).toBe('session-aaa');
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
  });

  it('a 401 during validation preserves B, creates nothing, and propagates', async () => {
    // M1 regression: an expired/invalid token must NOT destroy a valid B
    // pointer. The failure propagates (fail closed, no anonymous fallback)
    // so a later re-login can still resume B.
    setStoredSessionId('session-aaa');
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions/session-bbb')) {
        return json({ detail: 'Could not validate credentials' }, 401);
      }
      throw new Error(`unexpected ${url}`);
    });

    await expect(ensureWellbeingContext(AUTHED)).rejects.toMatchObject({ status: 401 });
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
    expect(getStoredSessionId()).toBe('session-aaa');
    expect(countCalls('/api/sessions')).toBe(1); // validate only, no create
  });

  it('a network failure during validation preserves B and propagates', async () => {
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions/session-bbb')) {
        throw new TypeError('network down');
      }
      throw new Error(`unexpected ${url}`);
    });

    await expect(ensureWellbeingContext(AUTHED)).rejects.toMatchObject({ status: 0 });
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
    expect(countCalls('/api/sessions')).toBe(1); // validate only, no create
  });

  it('a different user cannot resume another user\u2019s B', async () => {
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions')) return json({ ...SESSION_B, id: 'session-ccc' }, 201);
      throw new Error(`unexpected ${url}`);
    });

    const other = { status: 'authenticated' as const, user: { ...USER, id: 'u-2' } };
    const ctx = await ensureWellbeingContext(other);
    // u-2 has no pointer, so a fresh session is branched — u-1's B untouched.
    expect(ctx.sessionId).toBe('session-ccc');
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
    expect(getStoredAccountSessionId('u-2')).toBe('session-ccc');
  });
});

describe('no silent fallback', () => {
  it('a 401 on B chat throws without retrying anonymously', async () => {
    setStoredSessionId('session-aaa');
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions/session-bbb')) return json(SESSION_B);
      if (url.endsWith('/api/chat/message')) return json({ detail: 'Could not validate credentials' }, 401);
      throw new Error(`unexpected ${url}`);
    });

    await expect(sendWellbeingChatMessage(AUTHED, { message: 'hi' })).rejects.toMatchObject({ status: 401 });
    expect(countCalls('/api/chat/message')).toBe(1);
    // A was never sent, B pointer retained for an explicit re-login.
    expect(bodyOf('/api/chat/message')['session_id']).toBe('session-bbb');
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
    expect(getStoredSessionId()).toBe('session-aaa');
  });

  it('missing memory token fails closed instead of using A with stale identity', async () => {
    // status authenticated but no token (should not happen via AuthProvider,
    // but the resolver must never silently downgrade).
    clearAuthState();
    installFetch(async () => json({}));
    await expect(ensureWellbeingContext(AUTHED)).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
});

describe('logout transition', () => {
  it('returns to anonymous A and keeps B parked for resume', async () => {
    setStoredSessionId('session-aaa');
    setStoredAccountSessionId('u-1', 'session-bbb');
    clearAuthState();
    installFetch(async (url) => {
      if (url.endsWith('/api/chat/message')) {
        return json({ session_id: 'session-aaa', message_index: 1, risk_level: 'NORMAL', category: 'x', response: 'hi', is_crisis: false, language: 'en' });
      }
      throw new Error(`unexpected ${url}`);
    });

    const ctx = await ensureWellbeingContext(ANON);
    expect(ctx).toEqual({ mode: 'anonymous', sessionId: 'session-aaa', authHeaders: {} });
    await sendWellbeingChatMessage(ANON, { message: 'hi again' });
    expect(headerOf('/api/chat/message')['Authorization']).toBeUndefined();
    expect(getStoredAccountSessionId('u-1')).toBe('session-bbb');
  });
});

describe('follow-up ownership pairing', () => {
  it('attaches Bearer only when the screening session is my current B', async () => {
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async () => json({ screening_id: 's', action: 'SUPPORTIVE_CARE', new_safety_state: 'x', new_risk_level: 'MODERATE', supportive_guidance: 'g', safety_resources: [] }));

    await submitWellbeingFollowup(AUTHED, { sessionId: 'session-bbb', screeningId: 'scr-1', action: 'SUPPORTIVE_CARE' });
    expect(headerOf('/api/screenings/followup')['Authorization']).toBe(`Bearer ${TOKEN}`);

    requests.length = 0;
    // Same signed-in user, but the screening belongs to anonymous A: no Bearer.
    await submitWellbeingFollowup(AUTHED, { sessionId: 'session-aaa', screeningId: 'scr-2', action: 'SUPPORTIVE_CARE' });
    expect(headerOf('/api/screenings/followup')['Authorization']).toBeUndefined();
    expect(bodyOf('/api/screenings/followup')['session_id']).toBe('session-aaa');
  });
});

describe('bookings', () => {
  it('creates with the active session + matching auth pairing', async () => {
    setStoredSessionId('session-aaa');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions') && !url.includes('/api/sessions/')) return json(SESSION_B, 201);
      if (url.endsWith('/api/bookings')) {
        return json({ id: 'bk-1', confirmation_code: 'ABCD1234', status: 'PENDING', created_at: 't', updated_at: 't', slot: {}, counselor: {} }, 201);
      }
      throw new Error(`unexpected ${url}`);
    });

    await createWellbeingBooking(AUTHED, { slot_id: 'slot-1' });
    expect(bodyOf('/api/bookings')['session_id']).toBe('session-bbb');
    expect(headerOf('/api/bookings')['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(getStoredSessionId()).toBe('session-aaa');
  });

  it('attaches Bearer for detail/cancel when signed in, code-only when not', async () => {
    setAccessToken(TOKEN);
    installFetch(async () => json({ id: 'bk-1', confirmation_code: 'ABCD1234', status: 'PENDING', created_at: 't', updated_at: 't', slot: {}, counselor: {} }));

    await getWellbeingBooking(AUTHED, 'bk-1', { code: 'ABCD1234' });
    expect(headerOf('/api/bookings/bk-1')['Authorization']).toBe(`Bearer ${TOKEN}`);

    requests.length = 0;
    await cancelWellbeingBooking(ANON, 'bk-1', { code: 'ABCD1234' });
    expect(headerOf('/api/bookings/bk-1/cancel')['Authorization']).toBeUndefined();
  });
});

describe('token hygiene', () => {
  it('never writes tokens to browser storage during wellbeing flows', async () => {
    setStoredSessionId('session-aaa');
    setStoredAccountSessionId('u-1', 'session-bbb');
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions/session-bbb')) return json(SESSION_B);
      if (url.endsWith('/api/chat/message')) {
        return json({ session_id: 'session-bbb', message_index: 1, risk_level: 'NORMAL', category: 'x', response: 'hi', is_crisis: false, language: 'en' });
      }
      throw new Error(`unexpected ${url}`);
    });

    await sendWellbeingChatMessage(AUTHED, { message: 'hi' });
    const storedValues = [
      ...Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.getItem(sessionStorage.key(i) ?? '') ?? ''),
      ...Array.from({ length: localStorage.length }, (_, i) => localStorage.getItem(localStorage.key(i) ?? '') ?? ''),
    ];
    expect(storedValues.some((v) => v.includes(TOKEN))).toBe(false);
  });
});

describe('ensureAccountSession', () => {
  it('single-flights concurrent ensures to one create', async () => {
    setAccessToken(TOKEN);
    installFetch(async (url) => {
      if (url.endsWith('/api/sessions')) return json(SESSION_B, 201);
      throw new Error(`unexpected ${url}`);
    });

    const [a, b] = await Promise.all([
      ensureAccountSession({ userId: 'u-1', getToken: () => TOKEN }),
      ensureAccountSession({ userId: 'u-1', getToken: () => TOKEN }),
    ]);
    expect(a).toBe('session-bbb');
    expect(b).toBe('session-bbb');
    expect(countCalls('/api/sessions')).toBe(1);
  });

  it('requires a user id (never invents ownership)', async () => {
    installFetch(async () => json(SESSION_B, 201));
    await expect(ensureAccountSession({ userId: '', getToken: () => TOKEN })).rejects.toThrow();
    expect(requests).toHaveLength(0);
    clearStoredAccountSessionId('u-1');
  });
});
