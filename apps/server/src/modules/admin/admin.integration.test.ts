// Integration — admin module, HTTP layer (TESTING.md §3, UI §8.1). Mutates
// accounts/sessions/events, so it reseeds before every test.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import type { SnapshotCache } from '../../cache/index.js';
import { reseed, testDb } from '../../testSupport/emulator.js';
import { loginAs } from '../../testSupport/auth.js';

const TEST_ENV = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo-pvp-dashboard',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
  PVPDASH_ENV: 'production',
  PVPDASH_LOG_LEVEL: 'silent',
  PVPDASH_META_POLL_SECONDS: '3600',
  PVPDASH_SESSION_TTL_DAYS: '30',
} satisfies NodeJS.ProcessEnv;

/** mrossi starts with must_change_password: true (fixture); clear it directly
 *  so tests can isolate the ROLE gate from the must-change gate. */
async function clearMustChange(userId: string): Promise<void> {
  await testDb().collection('users').doc(userId).update({ must_change_password: false });
}

describe('admin module (HTTP, over the emulator)', () => {
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

  it('a non-admin gets 403 forbidden on admin routes', async () => {
    await clearMustChange('user-1');
    const cookie = await loginAs(app, 'mrossi', 'UserPass123!');
    const res = await app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.key).toBe('errors.auth.forbidden');
  });

  it('GET /admin/users never includes a password hash', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');
    const res = await app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const body = JSON.stringify(res.json());
    expect(body).not.toMatch(/argon2/);
  });

  it('creates an account with must_change_password: true, refuses a case-insensitive duplicate', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');

    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie },
      payload: { username: 'nuovoutente', password: 'Whatever123!', role: 'user' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().user.must_change_password).toBe(true);

    const dup = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie },
      payload: { username: 'NuovoUtente', password: 'Whatever123!', role: 'user' },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.key).toBe('errors.admin.usernameTaken');
  });

  it('admin-set-password revokes ALL of the target sessions and forces a change', async () => {
    await clearMustChange('user-1');
    const targetCookie = await loginAs(app, 'mrossi', 'UserPass123!');
    const adminCookie = await loginAs(app, 'admin', 'AdminPass123!');

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-1/password',
      headers: { cookie: adminCookie },
      payload: { new_password: 'AdminChosenPass1!' },
    });
    expect(res.statusCode).toBe(204);

    const targetMe = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: targetCookie },
    });
    expect(targetMe.statusCode).toBe(401); // old session revoked

    const relogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'mrossi', password: 'AdminChosenPass1!' },
    });
    expect(relogin.statusCode).toBe(200);
    expect(relogin.json().user.must_change_password).toBe(true);
  });

  it('refuses to demote or disable the last active admin (409 lastAdmin)', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');

    const demote = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-admin-1/role',
      headers: { cookie },
      payload: { role: 'user' },
    });
    expect(demote.statusCode).toBe(409);
    expect(demote.json().error.key).toBe('errors.admin.lastAdmin');

    const disable = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-admin-1/disable',
      headers: { cookie },
    });
    expect(disable.statusCode).toBe(409);
    expect(disable.json().error.key).toBe('errors.admin.lastAdmin');
  });

  it('role change takes effect immediately without revoking the existing session', async () => {
    await clearMustChange('user-1');
    const targetCookie = await loginAs(app, 'mrossi', 'UserPass123!');
    const adminCookie = await loginAs(app, 'admin', 'AdminPass123!');

    await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-1/role',
      headers: { cookie: adminCookie },
      payload: { role: 'admin' },
    });

    // Same session, no re-login — the role gate re-checks live per request.
    const now = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { cookie: targetCookie },
    });
    expect(now.statusCode).toBe(200);
  });

  it('disable revokes sessions immediately; re-enable allows sign-in again', async () => {
    await clearMustChange('user-1');
    const adminCookie = await loginAs(app, 'admin', 'AdminPass123!');
    const targetCookie = await loginAs(app, 'mrossi', 'UserPass123!');

    const disableRes = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-1/disable',
      headers: { cookie: adminCookie },
    });
    expect(disableRes.statusCode).toBe(200);
    expect(disableRes.json().user.disabled).toBe(true);

    const revoked = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: targetCookie },
    });
    expect(revoked.statusCode).toBe(401);

    const loginWhileDisabled = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'mrossi', password: 'UserPass123!' },
    });
    expect(loginWhileDisabled.statusCode).toBe(401);

    const enableRes = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-1/enable',
      headers: { cookie: adminCookie },
    });
    expect(enableRes.statusCode).toBe(200);
    expect(enableRes.json().user.disabled).toBe(false);

    const loginAfterEnable = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'mrossi', password: 'UserPass123!' },
    });
    expect(loginAfterEnable.statusCode).toBe(200);
  });

  it('every lifecycle action is recorded to admin_events, newest first', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');

    await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie },
      payload: { username: 'tracciato', password: 'Whatever123!', role: 'user' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/admin/events', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const events = res.json().events as Array<{ type: string; at: string }>;
    expect(events[0]!.type).toBe('account_created'); // the one just created, newest first
    expect(events.length).toBeGreaterThanOrEqual(3); // + the 2 seeded fixture events
  });
});
