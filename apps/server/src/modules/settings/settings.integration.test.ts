// Integration — settings module, HTTP layer (TESTING.md §3, UI §8.2). Covers
// the one Part A write in the whole codebase, so every test reseeds first.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_CATEGORY_SELECTION } from '@pvp/shared';
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

describe('settings module (HTTP, over the emulator)', () => {
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

  it('a non-admin gets 403 forbidden on both routes', async () => {
    await testDb().collection('users').doc('user-1').update({ must_change_password: false });
    const cookie = await loginAs(app, 'mrossi', 'UserPass123!');

    const get = await app.inject({
      method: 'GET',
      url: '/api/admin/categories',
      headers: { cookie },
    });
    expect(get.statusCode).toBe(403);
    expect(get.json().error.key).toBe('errors.auth.forbidden');

    const put = await app.inject({
      method: 'PUT',
      url: '/api/admin/categories',
      headers: { cookie },
      payload: { codes: ['LG'] },
    });
    expect(put.statusCode).toBe(403);
  });

  it('GET reflects the seeded selection (not the fallback default)', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/categories',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.selection).toContain('LG');
    expect(body.updated_by).toBe('user-admin-1');
    expect(body.is_default).toBe(false);
    expect(body.catalog.length).toBeGreaterThan(0);
    // Fixture listing 1061 (Grey Zone) carries the invented out-of-catalog
    // code "ZXQ9" specifically to exercise this fail-open group (UI §8.2).
    expect(body.unrecognized_codes).toEqual(['ZXQ9']);
  });

  it('GET falls back to the default selection, flagged as such, when the doc is absent', async () => {
    await testDb().collection('settings').doc('extraction_categories').delete();
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/categories',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.selection).toEqual([...DEFAULT_CATEGORY_SELECTION]);
    expect(body.is_default).toBe(true);
    expect(body.updated_at).toBeNull();
    expect(body.updated_by).toBeNull();
  });

  it('PUT round-trips a new selection, records an admin event, and a subsequent GET reflects it', async () => {
    const cookie = await loginAs(app, 'admin', 'AdminPass123!');

    const put = await app.inject({
      method: 'PUT',
      url: '/api/admin/categories',
      headers: { cookie },
      payload: { codes: ['LG', 'FALL'] },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().selection).toEqual(['LG', 'FALL']);

    const get = await app.inject({
      method: 'GET',
      url: '/api/admin/categories',
      headers: { cookie },
    });
    const body = get.json();
    expect(body.selection).toEqual(['LG', 'FALL']);
    expect(body.is_default).toBe(false);
    expect(body.updated_by).toBe('user-admin-1');

    const events = await app.inject({
      method: 'GET',
      url: '/api/admin/events',
      headers: { cookie },
    });
    const list = events.json().events as Array<{ type: string; subject: string | null }>;
    expect(list[0]!.type).toBe('categories_changed');
    expect(list[0]!.subject).toBe('settings/extraction_categories');
  });
});
