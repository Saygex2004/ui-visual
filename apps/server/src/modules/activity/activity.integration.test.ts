// Integration — activity module, HTTP layer (TESTING.md §3, UI §4.5). Fixture
// facts (seed/fixtures/listing_activity.json): listing 1001 has 4 events whose
// `at` values are NOT monotonic with their fixture ids — act-6 (calendar_assigned,
// 07:00) is earlier than act-1 (rating_set, 09:00) despite sorting after it by
// id — a genuine test of "newest first by `at`", not an accidental id-order
// pass. actor_id user-1 → username mrossi, user-admin-1 → admin
// (seed/fixtures/users.json).
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

describe('activity module (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;
  let cookie: string;

  beforeEach(async () => {
    await reseed();
    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
    cookie = await loginAs(app, 'admin', 'AdminPass123!');
  }, 30_000);

  afterEach(async () => {
    cache?.stopPolling();
    await app.close();
  });

  it('returns a listing timeline newest-first, with actor usernames resolved', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1001/activity',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const events = res.json().events as Array<{ type: string; actor_username: string | null }>;

    expect(events.map((e) => e.type)).toEqual([
      'attachment_added', // act-3, 09:10
      'thread_opened', // act-2, 09:05
      'rating_set', // act-1, 09:00
      'calendar_assigned', // act-6, 07:00 — earlier than the others despite its id
    ]);
    expect(events[0]!.actor_username).toBe('admin'); // act-3, user-admin-1
    expect(events[1]!.actor_username).toBe('mrossi'); // act-2, user-1
  });

  it('a system-observed event (null actor_id) resolves to a null actor_username', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1050/activity',
      headers: { cookie },
    });
    const events = res.json().events as Array<{
      type: string;
      actor_id: string | null;
      actor_username: string | null;
    }>;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'listing_archived',
      actor_id: null,
      actor_username: null,
    });
  });

  it('an unknown listing id returns an empty list, not a 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/999999/activity',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().events).toEqual([]);
  });

  it('a listing with no activity at all returns an empty list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1055/activity',
      headers: { cookie },
    });
    expect(res.json().events).toEqual([]);
  });
});
