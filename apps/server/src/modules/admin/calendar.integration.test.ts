// Integration — admin calendar assignment, HTTP layer (TESTING.md §3, UI
// §8.3). Same fixture facts as modules/calendar/calendar.integration.test.ts:
// 2026-07-02 (user-1) = [1001(completed,rated),1004(assigned),1005,1006,1007
// (neither)]; 2026-07-03 (user-1) = [2001(no entry at all),2002(assigned)] —
// both corporate. 1008 excluded-rito, 1051 archived — never drawable by the
// engine regardless of admin/random mode.
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

async function clearMustChange(userId: string): Promise<void> {
  await testDb().collection('users').doc(userId).update({ must_change_password: false });
}

const NEVER_DRAWN = ['1001', '1004', '1005', '1006', '1007', '2002', '1008', '1051'];
const CORPORATE_IDS = ['2001', '2002', '2003', '2004', '2005', '2006'];

describe('admin calendar module (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;
  let adminCookie: string;
  let mrossiCookie: string;

  beforeEach(async () => {
    await reseed();
    await clearMustChange('user-1');
    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
    adminCookie = await loginAs(app, 'admin', 'AdminPass123!');
    mrossiCookie = await loginAs(app, 'mrossi', 'UserPass123!');
  }, 30_000);

  afterEach(async () => {
    cache?.stopPolling();
    await app.close();
  });

  it('a non-admin gets 403 on every admin calendar route', async () => {
    const attempts = [
      { method: 'POST' as const, url: '/api/admin/calendar/random', payload: {} },
      { method: 'GET' as const, url: '/api/admin/calendar/user-1/2026-07-02' },
      { method: 'DELETE' as const, url: '/api/admin/calendar/user-1/2026-07-02', payload: {} },
      { method: 'GET' as const, url: '/api/admin/listings/search?q=1001' },
      { method: 'POST' as const, url: '/api/admin/calendar/by-id', payload: {} },
    ];
    for (const attempt of attempts) {
      const res = await app.inject({ ...attempt, headers: { cookie: mrossiCookie } });
      expect(res.statusCode, `${attempt.method} ${attempt.url}`).toBe(403);
    }
  });

  it('random assignment is additive across repeated calls, never duplicates, never draws ineligible ids', async () => {
    const date = '2026-09-10';
    const first = await app.inject({
      method: 'POST',
      url: '/api/admin/calendar/random',
      headers: { cookie: adminCookie },
      payload: { user_id: 'user-1', date, count: 3 },
    });
    expect(first.statusCode).toBe(200);
    const firstAssigned = first.json().assigned as string[];
    expect(firstAssigned).toHaveLength(3);

    const second = await app.inject({
      method: 'POST',
      url: '/api/admin/calendar/random',
      headers: { cookie: adminCookie },
      payload: { user_id: 'user-1', date, count: 3 },
    });
    const secondAssigned = second.json().assigned as string[];
    expect(secondAssigned).toHaveLength(3);

    const all = [...firstAssigned, ...secondAssigned];
    expect(new Set(all).size).toBe(6); // no duplicates across the two calls
    for (const id of all) {
      expect(NEVER_DRAWN).not.toContain(id);
      expect(CORPORATE_IDS).not.toContain(id);
    }

    const dayDoc = await testDb().collection('calendar_days').doc(`user-1_${date}`).get();
    expect((dayDoc.data()?.listing_ids as string[]).length).toBe(6);
    expect(dayDoc.data()?.generated).toBe('admin');
  });

  it('random assignment onto a pre-existing auto day flips generated to mixed', async () => {
    // Seeded directly (not via a real auto-assign) so this test verifies only
    // the `generated` transition, independent of how big the eligible pool
    // happens to be — an auto-assign can itself exhaust the pool, which would
    // make a real "one more" random assignment flaky at this fixture's scale.
    const date = '2026-09-15';
    const now = new Date();
    await testDb()
      .collection('calendar_days')
      .doc(`user-1_${date}`)
      .set({
        user_id: 'user-1',
        date,
        listing_ids: ['1005'],
        generated: 'auto',
        created_at: now,
        updated_at: now,
      });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/calendar/random',
      headers: { cookie: adminCookie },
      payload: { user_id: 'user-1', date, count: 1 },
    });
    expect(res.statusCode).toBe(200);

    const afterDoc = await testDb().collection('calendar_days').doc(`user-1_${date}`).get();
    expect(afterDoc.data()?.generated).toBe('mixed');
  });

  it('GET /admin/calendar/:userId/:date lists what is assigned, for the removal screen', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/calendar/user-1/2026-07-02',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    const listings = res.json().listings as Array<{ id: string }>;
    expect(listings.map((l) => l.id)).toEqual(['1001', '1004', '1005', '1006', '1007']);
  });

  it('removal severs the calendar link only: a completed entry, its rating, and the listing all survive', async () => {
    const beforeAssignment = await testDb().collection('assignment_index').doc('1001').get();
    const completedAtBefore = beforeAssignment.data()!.completed_at as FirebaseFirestore.Timestamp;

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/admin/calendar/user-1/2026-07-02',
      headers: { cookie: adminCookie },
      payload: { listing_ids: ['1001', '1004'] },
    });
    expect(del.statusCode).toBe(200);
    expect((del.json().removed as string[]).sort()).toEqual(['1001', '1004']);

    // 1001 is completed — its assignment_index entry is permanent, untouched.
    const assignment1001 = await testDb().collection('assignment_index').doc('1001').get();
    expect(assignment1001.exists).toBe(true);
    expect(
      (assignment1001.data()!.completed_at as FirebaseFirestore.Timestamp).isEqual(
        completedAtBefore,
      ),
    ).toBe(true);
    const rating1001 = await testDb().collection('ratings').doc('1001').get();
    expect(rating1001.exists).toBe(true);
    const listing1001 = await testDb().collection('listings').doc('1001').get();
    expect(listing1001.exists).toBe(true);

    // 1004 was NOT completed — its entry is freed for reassignment.
    const assignment1004 = await testDb().collection('assignment_index').doc('1004').get();
    expect(assignment1004.exists).toBe(false);

    const dayDoc = await testDb().collection('calendar_days').doc('user-1_2026-07-02').get();
    expect((dayDoc.data()?.listing_ids as string[]).sort()).toEqual(['1005', '1006', '1007']);
  });

  it('removal on a day with no assignments at all is a no-op, not an error', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/admin/calendar/user-1/2099-01-01',
      headers: { cookie: adminCookie },
      payload: { listing_ids: ['1001'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().removed).toEqual([]);
  });

  it('search with no query returns nothing (not a full dump)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/listings/search',
      headers: { cookie: adminCookie },
    });
    expect(res.json().results).toEqual([]);
  });

  it('search finds both areas, marking area + completed correctly', async () => {
    const immobiliRes = await app.inject({
      method: 'GET',
      url: '/api/admin/listings/search?q=1001',
      headers: { cookie: adminCookie },
    });
    const immobiliResults = immobiliRes.json().results as Array<{
      id: string;
      area: string;
      completed: boolean;
    }>;
    expect(immobiliResults).toHaveLength(1);
    expect(immobiliResults[0]).toMatchObject({ id: '1001', area: 'immobili', completed: true });

    const corporateRes = await app.inject({
      method: 'GET',
      url: '/api/admin/listings/search?q=2001',
      headers: { cookie: adminCookie },
    });
    const corporateResults = corporateRes.json().results as Array<{
      id: string;
      area: string;
      completed: boolean;
    }>;
    expect(corporateResults).toHaveLength(1);
    expect(corporateResults[0]).toMatchObject({ id: '2001', area: 'crediti', completed: false });
  });

  it('by-id assigns a corporate listing — the only path it can enter a calendar', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/calendar/by-id',
      headers: { cookie: adminCookie },
      payload: { user_id: 'user-1', date: '2026-09-01', listing_ids: ['2001'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ assigned: ['2001'], skipped: [] });

    const dayDoc = await testDb().collection('calendar_days').doc('user-1_2026-09-01').get();
    expect(dayDoc.data()?.listing_ids).toEqual(['2001']);
    const assignment = await testDb().collection('assignment_index').doc('2001').get();
    expect(assignment.data()).toMatchObject({ assigned_to: 'user-1' });
  });

  it('by-id skips nonexistent and already-completed ids, reporting why', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/calendar/by-id',
      headers: { cookie: adminCookie },
      payload: { user_id: 'user-1', date: '2026-09-02', listing_ids: ['9999999', '1001'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      assigned: string[];
      skipped: Array<{ id: string; reason: string }>;
    };
    expect(body.assigned).toEqual([]);
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        { id: '9999999', reason: 'not_found' },
        { id: '1001', reason: 'completed' },
      ]),
    );
  });

  it('by-id can reassign an already-assigned-but-uncompleted listing to a different user (deliberate)', async () => {
    const before = await testDb().collection('assignment_index').doc('1004').get();
    expect(before.data()?.assigned_to).toBe('user-1');

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/calendar/by-id',
      headers: { cookie: adminCookie },
      payload: { user_id: 'user-admin-1', date: '2026-09-03', listing_ids: ['1004'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ assigned: ['1004'], skipped: [] });

    const after = await testDb().collection('assignment_index').doc('1004').get();
    expect(after.data()?.assigned_to).toBe('user-admin-1');
  });
});
