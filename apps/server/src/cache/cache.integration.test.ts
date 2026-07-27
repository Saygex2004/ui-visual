// Integration — snapshot cache (TESTING.md §3). This file's later tests
// mutate shared fixture documents (simulating scraper transitions), so it
// reseeds the canonical dataset before EVERY test (not just once) — otherwise
// a mutation from one test would leak into the next test's assumptions.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { SnapshotCache } from './cache.js';
import * as listingsRepo from '../repositories/listings.js';
import { reseed, testDb } from '../testSupport/emulator.js';

beforeEach(async () => {
  await reseed();
}, 30_000);

function makeCache(): SnapshotCache {
  // A large poll interval: these tests drive rebuilds manually via
  // cache.poll()/cache.rebuild(), never via the setInterval timer.
  return new SnapshotCache(testDb(), { metaPollSeconds: 3600, snapshotMaxAgeHours: 24 });
}

describe('SnapshotCache.isReady', () => {
  it('is false before init, true once both scopes are primed', async () => {
    const cache = makeCache();
    expect(cache.isReady()).toBe(false);
    await cache.init();
    expect(cache.isReady()).toBe(true);
  });
});

describe('SnapshotCache — snapshot content (hand-counted against the fixture)', () => {
  it('immobili: exact cluster membership, archive, excluded count, blocco index, omi map', async () => {
    const cache = makeCache();
    await cache.init();
    const snap = cache.get('immobili')!;

    expect(snap.meta.excluded_by_rules).toBe(8);

    const byCluster = Object.fromEntries(snap.clusters.map((c) => [c.key, c]));
    expect(byCluster.red!.buckets.principali.map((r) => r.id).sort()).toEqual(['1001', '1032']);
    expect(byCluster.red!.buckets.fallimenti.map((r) => r.id).sort()).toEqual([
      '1002',
      '1020',
      '1021',
    ]);
    expect(byCluster.blue_chip!.buckets.principali.map((r) => r.id).sort()).toEqual(
      ['1004', '1030', '1031', '1040', '1055', '1060'].sort(),
    );
    expect(byCluster.blue_chip!.buckets.fallimenti.map((r) => r.id)).toEqual(['1003']);
    expect(byCluster.green!.buckets.principali.map((r) => r.id).sort()).toEqual(['1005', '1006']);
    expect(byCluster.green!.buckets.fallimenti).toHaveLength(0);
    expect(byCluster.grey!.buckets.principali.map((r) => r.id).sort()).toEqual([
      '1007',
      '1033',
      '1061',
    ]);
    expect(byCluster.black!.buckets.principali.map((r) => r.id).sort()).toEqual([
      '1009',
      '1010',
      '1034',
    ]);

    expect(snap.archive.map((r) => r.id).sort()).toEqual(['1050', '1051']);

    const bloccoCounts = Object.values(snap.blocco_index)
      .map((e) => e.count)
      .sort();
    expect(bloccoCounts).toEqual([2, 5]);

    expect(Object.keys(snap.omi_by_comune).sort()).toEqual([
      'l-aquila-l-aquila',
      'milano-milano',
      'napoli-napoli',
      'roma-roma',
    ]);
  });

  it('corporate: scope isolation — never leaks an immobili listing id, or vice versa', async () => {
    const cache = makeCache();
    await cache.init();
    const idsOf = (snap: ReturnType<SnapshotCache['get']>) =>
      new Set(
        snap!.clusters
          .flatMap((c) => [...c.buckets.principali, ...c.buckets.fallimenti])
          .map((r) => r.id),
      );

    const corporateIds = idsOf(cache.get('corporate'));
    const immobiliIds = idsOf(cache.get('immobili'));

    expect([...corporateIds].sort()).toEqual(['2001', '2002', '2003', '2004', '2005', '2006']);
    for (const id of corporateIds) expect(immobiliIds.has(id)).toBe(false);
    for (const id of immobiliIds) expect(corporateIds.has(id)).toBe(false);
  });

  it('serves the primed snapshot with zero further Firestore reads', async () => {
    const cache = makeCache();
    await cache.init();
    const spy = vi.spyOn(listingsRepo, 'getByScope');
    const callsBefore = spy.mock.calls.length;

    for (let i = 0; i < 25; i++) {
      cache.get('immobili');
      cache.get('corporate');
    }

    expect(spy.mock.calls.length).toBe(callsBefore); // no new repository calls
    spy.mockRestore();
  });
});

describe('SnapshotCache.poll — meta-driven invalidation and activity diffing', () => {
  it('archives an active listing on a meta change and records listing_archived', async () => {
    const db = testDb();
    const cache = makeCache();
    await cache.init();

    expect(
      cache
        .get('immobili')!
        .clusters.find((c) => c.key === 'green')!
        .buckets.principali.map((r) => r.id),
    ).toContain('1006');

    // Simulate the scraper archiving listing 1006 and completing a refresh.
    await db.collection('listings').doc('1006').update({ archived_at: Timestamp.now() });
    await db.collection('meta').doc('immobili').update({ last_success_at: Timestamp.now() });

    const rebuilt = await cache.poll();
    expect(rebuilt).toEqual(['immobili']);

    const after = cache.get('immobili')!;
    expect(
      after.clusters.find((c) => c.key === 'green')!.buckets.principali.map((r) => r.id),
    ).not.toContain('1006');
    expect(after.archive.map((r) => r.id)).toContain('1006');

    const activityDocs = await db
      .collection('listing_activity')
      .where('listing_id', '==', '1006')
      .where('type', '==', 'listing_archived')
      .get();
    expect(activityDocs.size).toBe(1);
    expect(activityDocs.docs[0]!.data().actor_id).toBeNull(); // system-observed event
  });

  it('reactivates an archived listing on a meta change and records listing_reactivated', async () => {
    const db = testDb();
    const cache = makeCache();
    await cache.init();

    expect(cache.get('immobili')!.archive.map((r) => r.id)).toContain('1050');

    await db.collection('listings').doc('1050').update({ archived_at: null });
    await db.collection('meta').doc('immobili').update({ last_success_at: Timestamp.now() });

    await cache.poll();

    const after = cache.get('immobili')!;
    expect(after.archive.map((r) => r.id)).not.toContain('1050');

    const activityDocs = await db
      .collection('listing_activity')
      .where('listing_id', '==', '1050')
      .where('type', '==', 'listing_reactivated')
      .get();
    expect(activityDocs.size).toBe(1);
  });

  it('is a no-op when meta signals are unchanged (no spurious rebuild)', async () => {
    const cache = makeCache();
    await cache.init();
    const versionBefore = cache.get('immobili')!.version;

    const rebuilt = await cache.poll();

    expect(rebuilt).toEqual([]);
    expect(cache.get('immobili')!.version).toBe(versionBefore);
  });

  it('version is stable across a rebuild with unchanged content, and changes when content changes', async () => {
    const cache = makeCache();
    await cache.init();
    const v1 = cache.get('immobili')!.version;

    await cache.rebuild('immobili'); // manual rebuild, nothing changed underneath
    expect(cache.get('immobili')!.version).toBe(v1);

    await testDb().collection('listings').doc('1006').update({ archived_at: Timestamp.now() });
    await cache.rebuild('immobili');
    expect(cache.get('immobili')!.version).not.toBe(v1);
  });

  it('scope isolation on rebuild: a corporate-only poll never touches immobili', async () => {
    const db = testDb();
    const cache = makeCache();
    await cache.init();
    const immobiliVersionBefore = cache.get('immobili')!.version;

    await db.collection('meta').doc('corporate').update({ last_success_at: Timestamp.now() });
    const rebuilt = await cache.poll();

    expect(rebuilt).toEqual(['corporate']);
    expect(cache.get('immobili')!.version).toBe(immobiliVersionBefore);
  });
});
