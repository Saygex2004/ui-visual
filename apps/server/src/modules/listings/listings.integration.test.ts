// Integration — listings module, HTTP layer (TESTING.md §3/§4). Phase 3 locked
// every route behind a session; this file logs in once in beforeAll and reuses
// that cookie (read-only routes, no account mutation — a shared login is safe
// and faster than reseeding per test).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  PVPDASH_META_POLL_SECONDS: '3600', // no automatic rebuild mid-test
} satisfies NodeJS.ProcessEnv;

interface ListingRowLike {
  id: string;
}
interface ClusterLike {
  key: string;
  buckets: { principali: ListingRowLike[]; fallimenti: ListingRowLike[] };
}
interface BloccoSiblingLike {
  id: string;
  cluster_key: string;
}

describe('listings module (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;
  let cookie: string;

  beforeAll(async () => {
    await reseed();
    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
    // admin has must_change_password: false in the fixture — no must-change
    // gate to work around for these read-only checks.
    cookie = await loginAs(app, 'admin', 'AdminPass123!');
  }, 30_000);

  afterAll(async () => {
    cache?.stopPolling();
    await app.close();
  });

  it('GET /readyz reports ready once the data layer is primed (no auth required)', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', checks: {} });
  });

  it('is locked behind a session (Phase 3: every Phase 2 route now requires one)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/areas/immobili/snapshot' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/areas/immobili/snapshot returns exact hand-counted cluster totals', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/areas/immobili/snapshot',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { clusters: ClusterLike[]; meta: { excluded_by_rules: number } };
    const red = body.clusters.find((c) => c.key === 'red')!;
    expect(red.buckets.principali.map((r) => r.id).sort()).toEqual(['1001', '1032']);
    expect(red.buckets.fallimenti.map((r) => r.id).sort()).toEqual(['1002', '1020', '1021']);
    expect(body.meta.excluded_by_rules).toBe(8);
  });

  it('ETag/If-None-Match: repeating the request with the returned ETag answers 304, empty body', async () => {
    const first = await app.inject({
      method: 'GET',
      url: '/api/areas/immobili/snapshot',
      headers: { cookie },
    });
    const etag = first.headers.etag as string;
    expect(etag).toBe((first.json() as { version: string }).version);

    const second = await app.inject({
      method: 'GET',
      url: '/api/areas/immobili/snapshot',
      headers: { cookie, 'if-none-match': etag },
    });
    expect(second.statusCode).toBe(304);
    expect(second.body).toBe('');
  });

  it('a stale If-None-Match still returns 200 with the full snapshot', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/areas/immobili/snapshot',
      headers: { cookie, 'if-none-match': 'not-a-real-version' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/areas/:area/snapshot 404s for an unknown area slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/areas/pippo/snapshot',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 404, key: 'errors.common.notFound', details: {} },
    });
  });

  it('GET /api/listings/:id returns the full untrimmed descrizione and correct classification', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1055',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.descrizione).toContain('<script>');
    expect(body.classification).toEqual({
      area: 'immobili',
      cluster_key: 'blue_chip',
      cluster_number: 2,
      cluster_name: expect.any(String),
      bucket: 'principali',
      excluded: false,
      band: 'media',
    });
    expect(body.rating).toBeNull();
    expect(body.thread).toEqual({ exists: false, closed: false, unread: 0 });
    expect(body.blocco).toBeNull(); // 1055 has no blocco key fields
  });

  it('GET /api/listings/:id embeds the current rating when one exists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1001',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().rating).toEqual({
      value: 'ottimo_affare',
      set_by: 'user-1',
      set_at: '2026-07-02T09:00:00.000Z',
    });
  });

  it('GET /api/listings/:id reports real thread facts when one exists (fixture: 1001, open, admin has 1 unread)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1001',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().thread).toEqual({ exists: true, closed: false, unread: 1 });
  });

  it('GET /api/listings/:id returns blocco siblings for a grouped lot, spanning clusters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1030',
      headers: { cookie },
    });
    const body = res.json() as { blocco: { count: number; siblings: BloccoSiblingLike[] } };
    expect(body.blocco.count).toBe(5);
    expect(body.blocco.siblings.map((s) => s.id).sort()).toEqual(['1031', '1032', '1033', '1034']);
    expect(new Set(body.blocco.siblings.map((s) => s.cluster_key))).toEqual(
      new Set(['blue_chip', 'red', 'grey', 'black']),
    );
  });

  it('GET /api/listings/:id 404s for an unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/999999',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/listings/:id resolves OMI context for a listing with a comune reference', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/1030', // comune: Roma
      headers: { cookie },
    });
    const body = res.json();
    expect(body.omi).toEqual(expect.objectContaining({ comune: 'Roma', available: true }));
  });

  it('GET /api/listings/:id has no OMI context for a corporate listing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/2001',
      headers: { cookie },
    });
    expect(res.json().omi).toBeNull();
  });
});
