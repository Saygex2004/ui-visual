// Integration — calendar module, HTTP layer (TESTING.md §3, UI §7). Fixture
// facts (seed/fixtures/calendar_days.json / assignment_index.json, both
// belong to user-1/mrossi): 2026-07-02 ("auto") = [1001,1004,1005,1006,1007]
// — only 1001 (completed, rated ottimo_affare per ratings.json) and 1004
// (assigned, not completed) have assignment_index entries at all; 1005/1006/
// 1007 have none. 2026-07-03 ("admin") = [2001,2002] (corporate) — only 2002
// has an assignment_index entry (not completed); 2001 has none, making it a
// genuinely fresh, unassigned corporate id for the by-id tests elsewhere.
// Neither fixture date is ever "today" at test-run time, so they exercise
// the frozen-day read path; the auto-assign transaction itself is tested
// against the real, dynamically-computed today.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import type { SnapshotCache } from '../../cache/index.js';
import { reseed, testDb } from '../../testSupport/emulator.js';
import { loginAs } from '../../testSupport/auth.js';
import { todayIso } from '../../repositories/calendar.js';

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

// Known-ineligible ids for the automatic/random engine, cross-checked against
// packages/shared's own calendar.test.ts fixture assertions: 1001/1004/2002
// (already carry an assignment_index entry), 1008 (excluded rito), 1051
// (archived). NOT 1005/1006/1007 — they appear in 2026-07-02's calendar_days
// fixture but deliberately have NO assignment_index entry at all (see the
// file header), so they remain genuinely eligible for a fresh draw.
const NEVER_AUTO_DRAWN = ['1001', '1004', '2002', '1008', '1051'];
const CORPORATE_IDS = ['2001', '2002', '2003', '2004', '2005', '2006'];

describe('calendar module (HTTP, over the emulator)', () => {
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

  it('GET /calendar/:month reports assigned/completed/actionable computed from live state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-07',
      headers: { cookie: mrossiCookie },
    });
    expect(res.statusCode).toBe(200);
    const days = res.json().days as Array<{
      date: string;
      assigned: number;
      completed: number;
      actionable: boolean;
    }>;
    expect(days).toEqual([
      // 1001 completed + rated ottimo_affare ⇒ completed:1, actionable:true;
      // 1004/1005/1006/1007 contribute nothing (not completed, not rated).
      { date: '2026-07-02', assigned: 5, completed: 1, actionable: true },
      // 2002 assigned-not-completed, 2001 has no entry at all, neither rated.
      { date: '2026-07-03', assigned: 2, completed: 0, actionable: false },
    ]);
  });

  it('GET /calendar/:month for a month with no days returns an empty list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar/2026-06',
      headers: { cookie: mrossiCookie },
    });
    expect(res.json().days).toEqual([]);
  });

  it('GET /calendar/day/:date on a frozen past day returns exactly the fixture set, never regenerated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar/day/2026-07-02',
      headers: { cookie: mrossiCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { listings: Array<{ id: string; area: string }>; progress: unknown };
    expect(body.listings.map((l) => l.id)).toEqual(['1001', '1004', '1005', '1006', '1007']);
    expect(body.listings.every((l) => l.area === 'immobili')).toBe(true);
    expect(body.progress).toEqual({ completed: 1, total: 5 });
  });

  it('GET /calendar/day/:date on a future date never generates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar/day/2099-01-01',
      headers: { cookie: mrossiCookie },
    });
    expect(res.json()).toEqual({ listings: [], progress: { completed: 0, total: 0 } });

    const doc = await testDb().collection('calendar_days').doc('user-1_2099-01-01').get();
    expect(doc.exists).toBe(false);
  });

  it('GET /calendar/day/:today first-opens: assigns eligible immobili, records calendar_assigned', async () => {
    const today = todayIso();
    const res = await app.inject({
      method: 'GET',
      url: `/api/calendar/day/${today}`,
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { listings: Array<{ id: string; area: string }> };
    expect(body.listings.length).toBeGreaterThan(0);
    expect(body.listings.length).toBeLessThanOrEqual(18);
    for (const row of body.listings) {
      expect(row.area).toBe('immobili');
      expect(NEVER_AUTO_DRAWN).not.toContain(row.id);
      expect(CORPORATE_IDS).not.toContain(row.id);
    }

    const dayDoc = await testDb().collection('calendar_days').doc(`user-admin-1_${today}`).get();
    expect(dayDoc.exists).toBe(true);
    expect(dayDoc.data()?.generated).toBe('auto');

    // The fixture itself seeds one pre-existing calendar_assigned event
    // (act-6, listing 1001, actor user-1, from 2026-07-02) — filter by THIS
    // test's own actor to isolate what this call actually appended.
    const activity = await testDb()
      .collection('listing_activity')
      .where('type', '==', 'calendar_assigned')
      .where('actor_id', '==', 'user-admin-1')
      .get();
    expect(activity.docs.length).toBe(body.listings.length);
    for (const doc of activity.docs) {
      expect(body.listings.map((l) => l.id)).toContain(doc.data().listing_id);
    }
  });

  it('reopening today returns the identical set (frozen, not re-drawn)', async () => {
    const today = todayIso();
    const first = await app.inject({
      method: 'GET',
      url: `/api/calendar/day/${today}`,
      headers: { cookie: adminCookie },
    });
    const second = await app.inject({
      method: 'GET',
      url: `/api/calendar/day/${today}`,
      headers: { cookie: adminCookie },
    });
    expect(second.json().listings).toEqual(first.json().listings);

    const activity = await testDb()
      .collection('listing_activity')
      .where('type', '==', 'calendar_assigned')
      .where('actor_id', '==', 'user-admin-1')
      .get();
    // Exactly one batch of events — the second open appended nothing more.
    expect(activity.docs.length).toBe(first.json().listings.length);
  });

  it('concurrency: two parallel first-opens by the SAME user produce exactly one assignment set', async () => {
    const today = todayIso();
    const [a, b] = await Promise.all([
      app.inject({
        method: 'GET',
        url: `/api/calendar/day/${today}`,
        headers: { cookie: mrossiCookie },
      }),
      app.inject({
        method: 'GET',
        url: `/api/calendar/day/${today}`,
        headers: { cookie: mrossiCookie },
      }),
    ]);
    expect(a.statusCode, a.body).toBe(200);
    expect(b.statusCode, b.body).toBe(200);
    expect(a.json().listings).toEqual(b.json().listings);

    const dayDoc = await testDb().collection('calendar_days').doc(`user-1_${today}`).get();
    expect(dayDoc.exists).toBe(true);
    const listingIds = dayDoc.data()?.listing_ids as string[];
    expect(new Set(listingIds).size).toBe(listingIds.length); // no duplicates
    expect(listingIds.length).toBe((a.json().listings as unknown[]).length);
  }, 20_000);

  it('concurrency: two parallel first-opens by DIFFERENT users never draw overlapping listings', async () => {
    const today = todayIso();
    const [adminRes, mrossiRes] = await Promise.all([
      app.inject({
        method: 'GET',
        url: `/api/calendar/day/${today}`,
        headers: { cookie: adminCookie },
      }),
      app.inject({
        method: 'GET',
        url: `/api/calendar/day/${today}`,
        headers: { cookie: mrossiCookie },
      }),
    ]);
    expect(adminRes.statusCode, adminRes.body).toBe(200);
    expect(mrossiRes.statusCode, mrossiRes.body).toBe(200);
    const adminIds = new Set((adminRes.json().listings as Array<{ id: string }>).map((l) => l.id));
    const mrossiIds = (mrossiRes.json().listings as Array<{ id: string }>).map((l) => l.id);
    for (const id of mrossiIds) expect(adminIds.has(id)).toBe(false);
  }, 20_000);

  it('a rating on an assigned-but-uncompleted listing advances the day progress live', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/calendar/day/2026-07-02',
      headers: { cookie: mrossiCookie },
    });
    expect(before.json().progress).toEqual({ completed: 1, total: 5 });

    const put = await app.inject({
      method: 'PUT',
      url: '/api/ratings/1004',
      headers: { cookie: mrossiCookie },
      payload: { value: 'da_verificare' },
    });
    expect(put.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: '/api/calendar/day/2026-07-02',
      headers: { cookie: mrossiCookie },
    });
    expect(after.json().progress).toEqual({ completed: 2, total: 5 });
  });
});
