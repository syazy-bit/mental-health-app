/**
 * Tests for the student auth API client (@/lib/auth-api).
 *
 * Security properties under test:
 * - access token lives ONLY in module memory (never browser storage)
 * - exactly-once refresh-and-retry, no loops
 * - concurrent 401s share ONE refresh (backend tokens rotate)
 * - refresh failure clears state; logout is best-effort
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthApiError,
  clearAuthState,
  fetchCurrentUser,
  getAccessToken,
  loginStudent,
  logoutStudent,
  refreshAccessToken,
  registerStudent,
  setAccessToken,
} from '@/lib/auth-api';

interface RecordedRequest {
  url: string;
  init: RequestInit;
}

let requests: RecordedRequest[];
let fetchMock: ReturnType<typeof vi.fn>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    return impl(String(url), init);
  });
  vi.stubGlobal('fetch', fetchMock);
}

function countCalls(path: string): number {
  return requests.filter((r) => r.url.endsWith(path)).length;
}

function authHeaderOf(path: string, occurrence = 0): string | undefined {
  const matches = requests.filter((r) => r.url.endsWith(path));
  const headers = matches[occurrence]?.init.headers as Record<string, string> | undefined;
  return headers?.['Authorization'];
}

const TOKEN_1 = 'access-token-one';
const TOKEN_2 = 'access-token-two';
const ME = { id: 'u-1', email: 's@example.com', display_name: 'Sam', created_at: '2026-01-01T00:00:00Z' };

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

describe('login / register', () => {
  it('stores the access token in memory and sends it as a Bearer header', async () => {
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/login')) {
        return json({ access_token: TOKEN_1, token_type: 'bearer', expires_in: 900 });
      }
      return json(ME);
    });

    await loginStudent({ email: 's@example.com', password: 'long-enough-password' });
    expect(getAccessToken()).toBe(TOKEN_1);

    await fetchCurrentUser();
    expect(authHeaderOf('/api/auth/me')).toBe(`Bearer ${TOKEN_1}`);
  });

  it('never writes tokens to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/login')) {
        return json({ access_token: TOKEN_1, token_type: 'bearer', expires_in: 900 });
      }
      return json(ME);
    });

    await loginStudent({ email: 's@example.com', password: 'long-enough-password' });
    await fetchCurrentUser();

    const written = setItem.mock.calls.map((c) => String(c[1]));
    expect(written.some((v) => v.includes(TOKEN_1))).toBe(false);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('sends display_name on register only when provided', async () => {
    installFetch(async () => json({ access_token: TOKEN_1, token_type: 'bearer', expires_in: 900 }));

    await registerStudent({ email: 'a@example.com', password: 'long-enough-password' });
    expect(JSON.parse(String(requests[0].init.body))).toEqual({
      email: 'a@example.com',
      password: 'long-enough-password',
    });

    await registerStudent({ email: 'b@example.com', password: 'long-enough-password', display_name: 'Bee' });
    expect(JSON.parse(String(requests[1].init.body))).toEqual({
      email: 'b@example.com',
      password: 'long-enough-password',
      display_name: 'Bee',
    });
  });

  it('surfaces backend errors with status and detail', async () => {
    installFetch(async () => json({ detail: 'An account with this email already exists.' }, 409));
    const error = await registerStudent({
      email: 's@example.com',
      password: 'long-enough-password',
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthApiError);
    expect((error as AuthApiError).status).toBe(409);
    expect((error as AuthApiError).message).toBe('An account with this email already exists.');
    expect(getAccessToken()).toBeNull();
  });

  it('maps network failure to status 0', async () => {
    installFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const error = await loginStudent({ email: 's@example.com', password: 'x' }).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(AuthApiError);
    expect((error as AuthApiError).status).toBe(0);
  });
});

describe('refresh and retry', () => {
  it('retries once with a new token after a 401', async () => {
    setAccessToken(TOKEN_1);
    installFetch(async (url, init) => {
      if (url.endsWith('/api/auth/refresh')) {
        return json({ access_token: TOKEN_2, token_type: 'bearer', expires_in: 900 });
      }
      const auth = (init?.headers as Record<string, string>)?.['Authorization'];
      if (auth === `Bearer ${TOKEN_1}`) return json({ detail: 'expired' }, 401);
      return json(ME);
    });

    const me = await fetchCurrentUser();
    expect(me.email).toBe('s@example.com');
    expect(countCalls('/api/auth/refresh')).toBe(1);
    expect(getAccessToken()).toBe(TOKEN_2);
    expect(authHeaderOf('/api/auth/me', 1)).toBe(`Bearer ${TOKEN_2}`);
  });

  it('does not attempt refresh when there was never a token', async () => {
    installFetch(async () => json({ detail: 'nope' }, 401));
    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 401 });
    expect(countCalls('/api/auth/refresh')).toBe(0);
  });

  it('clears state and throws when refresh fails — no retry loop', async () => {
    setAccessToken(TOKEN_1);
    installFetch(async (url) => {
      if (url.endsWith('/api/auth/refresh')) return json({ detail: 'bad' }, 401);
      return json({ detail: 'expired' }, 401);
    });

    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 401 });
    expect(countCalls('/api/auth/refresh')).toBe(1);
    // No retry after a failed refresh: the single initial /me call stands.
    expect(countCalls('/api/auth/me')).toBe(1);
    expect(getAccessToken()).toBeNull();
  });

  it('shares one refresh across concurrent 401s', async () => {
    setAccessToken(TOKEN_1);
    installFetch(async (url, init) => {
      if (url.endsWith('/api/auth/refresh')) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json({ access_token: TOKEN_2, token_type: 'bearer', expires_in: 900 });
      }
      const auth = (init?.headers as Record<string, string>)?.['Authorization'];
      if (auth === `Bearer ${TOKEN_1}`) return json({ detail: 'expired' }, 401);
      return json(ME);
    });

    const [a, b, c] = await Promise.all([
      fetchCurrentUser(),
      fetchCurrentUser(),
      fetchCurrentUser(),
    ]);
    expect(a.email).toBe('s@example.com');
    expect(b.email).toBe('s@example.com');
    expect(c.email).toBe('s@example.com');
    expect(countCalls('/api/auth/refresh')).toBe(1);
  });

  it('refreshAccessToken shares the in-flight promise directly', async () => {
    installFetch(async () =>
      json({ access_token: TOKEN_2, token_type: 'bearer', expires_in: 900 })
    );
    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);
    expect(a).toBe(TOKEN_2);
    expect(b).toBe(TOKEN_2);
    expect(countCalls('/api/auth/refresh')).toBe(1);
  });
});

describe('logout', () => {
  it('calls the backend and always clears memory state', async () => {
    setAccessToken(TOKEN_1);
    installFetch(async () => new Response(null, { status: 204 }));
    await logoutStudent();
    expect(countCalls('/api/auth/logout')).toBe(1);
    expect(getAccessToken()).toBeNull();
  });

  it('clears state even when the backend rejects (best-effort)', async () => {
    setAccessToken(TOKEN_1);
    installFetch(async () => json({ detail: 'gone' }, 401));
    await logoutStudent();
    expect(getAccessToken()).toBeNull();
  });
});
