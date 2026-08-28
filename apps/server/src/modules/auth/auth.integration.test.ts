// Integration — auth module, HTTP layer (TESTING.md §3 auth catalog).
// Mutates accounts/sessions, so it reseeds before every test (not just once).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import type { SnapshotCache } from '../../cache/index.js';
import { usersRepo } from '../../repositories/index.js';
import { reseed, testDb } from '../../testSupport/emulator.js';
import { loginAs, extractSessionCookie } from '../../testSupport/auth.js';
import { SESSION_COOKIE_NAME } from '../../plugins/auth.js';

const TEST_ENV = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo-pvp-dashboard',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
  PVPDASH_ENV: 'production',
  PVPDASH_LOG_LEVEL: 'silent',
  PVPDASH_META_POLL_SECONDS: '3600',
  PVPDASH_SESSION_TTL_DAYS: '30',
} satisfies NodeJS.ProcessEnv;

describe('auth module (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;

  beforeEach(async () => {
    await reseed();
    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
  }, 30_000);

  afterEach(async () => {
    cache?.stopPolling();
    await app.close();
  });

  it('locks a Phase 2 route without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/areas/immobili/snapshot' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 401, key: 'errors.auth.unauthenticated', details: {} },
    });
  });

  it('login: wrong password and unknown username get the identical error', async () => {
    const wrongPw = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'nope' },
    });
    const unknownUser = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ghost', password: 'nope' },
    });
    expect(wrongPw.statusCode).toBe(401);
    expect(unknownUser.statusCode).toBe(401);
    expect(wrongPw.json()).toEqual(unknownUser.json());
    expect(wrongPw.json().error.key).toBe('errors.auth.invalidCredentials');
  });

  it('login: correct credentials set an httpOnly session cookie and return the public user shape', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'AdminPass123!' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      user: {
        id: 'user-admin-1',
        username: 'admin',
        role: 'admin',
        must_change_password: false,
        // Empty, not populated: admins bypass the vista checks entirely, so
        // there is nothing to grant them. The field ships anyway because the
        // public user shape is one shape for every role.
        viste: [],
      },
    });
    const cookie = extractCookie(res);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
  });

  it('a disabled account is refused with the identical invalid-credentials error', async () => {
    await usersRepo.setDisabled(testDb(), 'user-1', true);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'mrossi', password: 'UserPass123!' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.key).toBe('errors.auth.invalidCredentials');
  });

  it('GET /auth/me returns the session account', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.username).toBe('admin');
  });

  it('logout deletes the session — a subsequent /auth/me is 401', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie },
    });
    expect(logoutRes.statusCode).toBe(204);
    expect(logoutRes.body).toBe('');

    const meRes = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(meRes.statusCode).toBe(401);
  });

  it('must-change gate: blocks other routes but /auth/me stays open', async () => {
    const cookie = await loginAs(app, 'mrossi', 'UserPass123!');

    const meRes = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    expect(meRes.statusCode).toBe(200);

    const snapshotRes = await app.inject({
      method: 'GET',
      url: '/api/areas/immobili/snapshot',
      headers: { cookie },
    });
    expect(snapshotRes.statusCode).toBe(403);
    expect(snapshotRes.json().error.key).toBe('errors.auth.mustChangePassword');
  });

  it('self password change clears must_change_password, keeps the current session, revokes others', async () => {
    const cookieA = await loginAs(app, 'mrossi', 'UserPass123!'); // "browser A"
    const loginB = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'mrossi', password: 'UserPass123!' },
    });
    const cookieB = extractSessionCookie(loginB); // "browser B" — a second concurrent session

    const changeRes = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie: cookieA },
      payload: { current_password: 'UserPass123!', new_password: 'BrandNewPass9!' },
    });
    expect(changeRes.statusCode).toBe(204);

    const meA = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookieA },
    });
    expect(meA.statusCode).toBe(200);
    expect(meA.json().user.must_change_password).toBe(false);

    const meB = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookieB },
    });
    expect(meB.statusCode).toBe(401);
  });

  it('self password change rejects a wrong current_password', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { cookie },
      payload: { current_password: 'totally-wrong', new_password: 'Whatever123!' },
    });
    expect(res.statusCode).toBe(401);
  });
});

function extractCookie(res: import('fastify').LightMyRequestResponse) {
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
  if (!cookie) throw new Error('no session cookie in response');
  return cookie;
}
