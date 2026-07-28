// Integration — ratings module, HTTP layer (TESTING.md §3, UI §5). Every
// test reseeds first. Fixture facts (seed/fixtures/ratings.json): 1001
// ottimo_affare/user-1/09:00, 1003 da_verificare/user-admin-1/09:30, 1030
// da_evitare/user-1/10:00 — id 1055 is genuinely unrated. assignment_index.json:
// 1001's completed_at is already set to the exact same instant as its rating
// (09:00), the deliberate pairing this file's permanence test relies on.
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

describe('ratings module (HTTP, over the emulator)', () => {
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

  it('PUT on a never-rated listing records rating_set and a completion-only assignment_index entry', async () => {
    const put = await app.inject({
      method: 'PUT',
      url: '/api/ratings/1055',
      headers: { cookie },
      payload: { value: 'ottimo_affare' },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().rating).toMatchObject({ value: 'ottimo_affare', set_by: 'user-admin-1' });

    const entry = await testDb().collection('assignment_index').doc('1055').get();
    expect(entry.exists).toBe(true);
    const data = entry.data()!;
    expect(data.assigned_to).toBeNull();
    expect(data.date).toBeNull();
    expect(data.completed_at).not.toBeNull();

    const activity = await app.inject({
      method: 'GET',
      url: '/api/listings/1055/activity',
      headers: { cookie },
    });
    const events = activity.json().events as Array<{ type: string; details: unknown }>;
    expect(events[0]).toMatchObject({ type: 'rating_set', details: { value: 'ottimo_affare' } });
  });

  it('PUT on an already-rated listing records rating_changed with from/to, and never touches an existing completion', async () => {
    const before = await testDb().collection('assignment_index').doc('1030').get();
    // 1030 has no assignment_index entry in the fixture at all — this exercises
    // the "changed value, but still an uncompleted listing" path separately
    // from 1001's already-completed path (covered in the DELETE test below).
    expect(before.exists).toBe(false);

    const put = await app.inject({
      method: 'PUT',
      url: '/api/ratings/1030',
      headers: { cookie },
      payload: { value: 'ottimo_affare' },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().rating.value).toBe('ottimo_affare');

    const activity = await app.inject({
      method: 'GET',
      url: '/api/listings/1030/activity',
      headers: { cookie },
    });
    const events = activity.json().events as Array<{ type: string; details: unknown }>;
    expect(events[0]).toMatchObject({
      type: 'rating_changed',
      details: { from: 'da_evitare', to: 'ottimo_affare' },
    });
  });

  it('DELETE clears the rating and appends rating_cleared, but never overwrites an already-recorded completion', async () => {
    const before = await testDb().collection('assignment_index').doc('1001').get();
    const completedAtBefore = before.data()!.completed_at as FirebaseFirestore.Timestamp;

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/ratings/1001',
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);

    const doc = await testDb().collection('ratings').doc('1001').get();
    expect(doc.exists).toBe(false);

    const after = await testDb().collection('assignment_index').doc('1001').get();
    const completedAtAfter = after.data()!.completed_at as FirebaseFirestore.Timestamp;
    expect(completedAtAfter.isEqual(completedAtBefore)).toBe(true);

    const activity = await app.inject({
      method: 'GET',
      url: '/api/listings/1001/activity',
      headers: { cookie },
    });
    const events = activity.json().events as Array<{ type: string; details: unknown }>;
    expect(events[0]).toMatchObject({
      type: 'rating_cleared',
      details: { value: 'ottimo_affare' },
    });
  });

  it('DELETE on an already-unrated listing is idempotent — 204, no activity event', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: '/api/ratings/1055',
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);

    const activity = await app.inject({
      method: 'GET',
      url: '/api/listings/1055/activity',
      headers: { cookie },
    });
    expect(activity.json().events).toEqual([]);
  });

  it('GET /ratings with no since returns the full current state', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ratings', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const ids = (res.json().ratings as Array<{ listing_id: string }>)
      .map((r) => r.listing_id)
      .sort();
    expect(ids).toEqual(['1001', '1003', '1030']);
  });

  it('GET /ratings?since excludes ratings set at or before the cursor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/ratings?since=2026-07-02T09:15:00.000Z', // between 1001 (09:00) and 1003 (09:30)
      headers: { cookie },
    });
    const ids = (res.json().ratings as Array<{ listing_id: string }>)
      .map((r) => r.listing_id)
      .sort();
    expect(ids).toEqual(['1003', '1030']);
  });

  it('a cleared rating appears as a {value:null} tombstone in the delta window', async () => {
    const before = await app.inject({ method: 'GET', url: '/api/ratings', headers: { cookie } });
    const since = before.json().now as string;

    await app.inject({
      method: 'PUT',
      url: '/api/ratings/1055',
      headers: { cookie },
      payload: { value: 'da_verificare' },
    });
    await app.inject({ method: 'DELETE', url: '/api/ratings/1055', headers: { cookie } });

    const delta = await app.inject({
      method: 'GET',
      url: `/api/ratings?since=${encodeURIComponent(since)}`,
      headers: { cookie },
    });
    const entries = delta.json().ratings as Array<{ listing_id: string; value: string | null }>;
    const entry = entries.find((r) => r.listing_id === '1055');
    expect(entry).toEqual({ listing_id: '1055', value: null, set_by: null, set_at: null });
  });

  it('a listing re-rated after being cleared, within the same window, reports the live value — not a tombstone', async () => {
    const before = await app.inject({ method: 'GET', url: '/api/ratings', headers: { cookie } });
    const since = before.json().now as string;

    await app.inject({
      method: 'PUT',
      url: '/api/ratings/1055',
      headers: { cookie },
      payload: { value: 'da_verificare' },
    });
    await app.inject({ method: 'DELETE', url: '/api/ratings/1055', headers: { cookie } });
    await app.inject({
      method: 'PUT',
      url: '/api/ratings/1055',
      headers: { cookie },
      payload: { value: 'da_evitare' },
    });

    const delta = await app.inject({
      method: 'GET',
      url: `/api/ratings?since=${encodeURIComponent(since)}`,
      headers: { cookie },
    });
    const entries = delta.json().ratings as Array<{ listing_id: string; value: string | null }>;
    const matching = entries.filter((r) => r.listing_id === '1055');
    expect(matching).toHaveLength(1); // exactly one entry, no duplicate tombstone+live
    expect(matching[0]!.value).toBe('da_evitare');
  });
});
