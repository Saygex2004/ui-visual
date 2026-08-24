// Integration — pratiche module, HTTP layer (TESTING.md §3). Exercises the
// whole write path against the emulator: admin gating, create → list → patch
// → delete, and the two shapes the schema is there to enforce (trimming to
// null, refusing box 0). Fixture accounts: admin/AdminPass123! is an admin,
// mrossi/UserPass123! is not (seed/fixtures/users.json).
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

const NUOVA = {
  ndg: '900123',
  numero_pratica: '163354',
  veicolo: 'Augusto',
  estinto: false,
  n_scatola: 3,
  plurima_riscontro: 'Augusto',
  note: 'Rinnovo ipoteca',
  ordinato_da: null,
};

describe('pratiche module (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;
  let adminCookie: string;

  beforeEach(async () => {
    await reseed();
    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
    adminCookie = await loginAs(app, 'admin', 'AdminPass123!');
  }, 30_000);

  afterEach(async () => {
    cache?.stopPolling();
    await app.close();
  });

  // `await`ed inside rather than returned raw: app.inject() hands back a
  // chainable that is also a promise, and returning it un-awaited types as
  // the chain (no .statusCode) even though it resolves fine at runtime.
  async function create(body: object, cookie = adminCookie) {
    return await app.inject({
      method: 'POST',
      url: '/api/pratiche',
      headers: { cookie },
      payload: body,
    });
  }

  async function list(cookie = adminCookie) {
    return await app.inject({ method: 'GET', url: '/api/pratiche', headers: { cookie } });
  }

  it('refuses every route to a non-admin, reads included', async () => {
    // The register names who ordered each file; hiding the card in the client
    // is presentation, this is the actual boundary.
    const userCookie = await loginAs(app, 'mrossi', 'UserPass123!');
    expect((await list(userCookie)).statusCode).toBe(403);
    expect((await create(NUOVA, userCookie)).statusCode).toBe(403);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: '/api/pratiche/whatever',
          headers: { cookie: userCookie },
        })
      ).statusCode,
    ).toBe(403);
  });

  it('refuses an anonymous caller', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/pratiche' })).statusCode).toBe(401);
  });

  it('creates, then returns the pratica in the list with its bookkeeping filled in', async () => {
    const created = await create(NUOVA);
    expect(created.statusCode).toBe(201);
    const pratica = created.json().pratica;
    expect(pratica.id).toBeTruthy();
    expect(pratica.ndg).toBe('900123');
    // created_at is resolved server-side; a sentinel leaking through here is
    // exactly what reading the document back after the write prevents.
    expect(typeof pratica.created_at).toBe('string');
    expect(Number.isNaN(Date.parse(pratica.created_at))).toBe(false);
    expect(pratica.created_by).toBeTruthy();
    expect(pratica.updated_at).toBeNull();

    const listed = await list();
    expect(listed.statusCode).toBe(200);
    const body = listed.json();
    expect(body.pratiche.map((p: { id: string }) => p.id)).toContain(pratica.id);
    // Accounts ship alongside so `ordinato_da` renders as a person, and carry
    // nothing else about the account.
    expect(body.utenti.length).toBeGreaterThan(0);
    expect(Object.keys(body.utenti[0]).sort()).toEqual(['id', 'username']);
  });

  it('stores a blank optional field as null, not as an empty string', async () => {
    // Otherwise "no vehicle" and "vehicle typed then cleared" become
    // indistinguishable in every later filter and export.
    const res = await create({ ...NUOVA, veicolo: '   ', note: '' });
    expect(res.statusCode).toBe(201);
    expect(res.json().pratica.veicolo).toBeNull();
    expect(res.json().pratica.note).toBeNull();
  });

  it('rejects a missing NDG and a box number of 0', async () => {
    expect((await create({ ...NUOVA, ndg: '  ' })).statusCode).toBe(400);
    // 0 would read as "box zero" rather than "not filed yet".
    expect((await create({ ...NUOVA, n_scatola: 0 })).statusCode).toBe(400);
  });

  it('patches only the fields sent, and records who changed it', async () => {
    const id = (await create(NUOVA)).json().pratica.id;
    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/pratiche/${id}`,
      headers: { cookie: adminCookie },
      payload: { estinto: true, n_scatola: 7 },
    });
    expect(patched.statusCode).toBe(200);
    const p = patched.json().pratica;
    expect(p.estinto).toBe(true);
    expect(p.n_scatola).toBe(7);
    expect(p.ndg).toBe('900123'); // untouched by a partial patch
    expect(p.updated_at).not.toBeNull();
    expect(p.updated_by).toBeTruthy();
  });

  it('answers 404 for a patch or delete on an id that does not exist', async () => {
    // Not a silent upsert: Firestore's own delete succeeds on a missing doc,
    // and `set` would resurrect one.
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/api/pratiche/non-esiste',
          headers: { cookie: adminCookie },
          payload: { estinto: true },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: '/api/pratiche/non-esiste',
          headers: { cookie: adminCookie },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('deletes, and the pratica stops being listed', async () => {
    const id = (await create(NUOVA)).json().pratica.id;
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/pratiche/${id}`,
      headers: { cookie: adminCookie },
    });
    expect(deleted.statusCode).toBe(204);
    const ids = (await list()).json().pratiche.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(id);
  });
});
