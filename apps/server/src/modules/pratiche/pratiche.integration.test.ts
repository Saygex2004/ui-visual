// Integration — pratiche module, HTTP layer (TESTING.md §3). Exercises the
// whole write path against the emulator: admin gating, create → list → patch
// → delete, and the shapes the schema is there to enforce (trimming to null,
// exact cents, valid stage, ISO dates). Fixture accounts: admin/AdminPass123! is an admin,
// mrossi/UserPass123! is not (seed/fixtures/users.json).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  PVPDASH_SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x',
  PVPDASH_SLACK_MENTION_ID: 'U01234ABC',
} satisfies NodeJS.ProcessEnv;

const NUOVA = {
  ndg: '900123',
  numero_pratica: '163354',
  portafoglio: 'Augusto',
  stato: 'spedito',
  n_scatole: '3, 7',
  note: 'Rinnovo ipoteca',
  ordinato_da: null,
  data_richiesta: '2026-08-20',
  data_spedizione: '2026-08-21',
  data_consegna_prevista: '2026-08-25',
  data_consegna_effettiva: null,
  costo_spedizione_cent: 1250,
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
    // Otherwise "no portfolio" and "portfolio typed then cleared" become
    // indistinguishable in every later filter and export.
    const res = await create({ ...NUOVA, portafoglio: '   ', note: '' });
    expect(res.statusCode).toBe(201);
    expect(res.json().pratica.portafoglio).toBeNull();
    expect(res.json().pratica.note).toBeNull();
  });

  it('keeps the shipping cost as an exact integer number of cents', async () => {
    const p = (await create({ ...NUOVA, costo_spedizione_cent: 17700 })).json().pratica;
    expect(p.costo_spedizione_cent).toBe(17700);
  });

  it('keeps the tracking dates and the stage as sent', async () => {
    const p = (await create(NUOVA)).json().pratica;
    expect(p.stato).toBe('spedito');
    expect(p.data_spedizione).toBe('2026-08-21');
    expect(p.data_consegna_prevista).toBe('2026-08-25');
    expect(p.data_consegna_effettiva).toBeNull();
  });

  it('defaults a new pratica to `richiesto` when no stage is given', async () => {
    // A record exists because someone asked for the file; that IS the state.
    const body = { ...NUOVA } as Record<string, unknown>;
    delete body.stato;
    expect((await create(body)).json().pratica.stato).toBe('richiesto');
  });

  it('rejects a missing NDG, an unknown stage, a negative cost and a bad date', async () => {
    expect((await create({ ...NUOVA, ndg: '  ' })).statusCode).toBe(400);
    expect((await create({ ...NUOVA, stato: 'smarrito' })).statusCode).toBe(400);
    expect((await create({ ...NUOVA, costo_spedizione_cent: -1 })).statusCode).toBe(400);
    // Cents, not euros: a fractional cent is not a thing.
    expect((await create({ ...NUOVA, costo_spedizione_cent: 12.5 })).statusCode).toBe(400);
    expect((await create({ ...NUOVA, data_spedizione: '21/08/2026' })).statusCode).toBe(400);
  });

  it('patches only the fields sent, and records who changed it', async () => {
    const id = (await create(NUOVA)).json().pratica.id;
    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/pratiche/${id}`,
      headers: { cookie: adminCookie },
      payload: { stato: 'consegnato', data_consegna_effettiva: '2026-08-24' },
    });
    expect(patched.statusCode).toBe(200);
    const p = patched.json().pratica;
    expect(p.stato).toBe('consegnato');
    expect(p.data_consegna_effettiva).toBe('2026-08-24');
    expect(p.data_spedizione).toBe('2026-08-21'); // untouched by a partial patch
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
          payload: { stato: 'consegnato' },
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

  it('notifies Slack on creation and on a stage change, but not otherwise', async () => {
    // The wiring, not the message: a patch that leaves `stato` alone must stay
    // silent, or every edited note would ping someone.
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const id = (await create(NUOVA)).json().pratica.id;
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchSpy.mock.calls[0]![1].body).text).toContain('<@U01234ABC>');

      await app.inject({
        method: 'PATCH',
        url: `/api/pratiche/${id}`,
        headers: { cookie: adminCookie },
        payload: { note: 'solo una nota' },
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1); // unchanged: no transition

      await app.inject({
        method: 'PATCH',
        url: `/api/pratiche/${id}`,
        headers: { cookie: adminCookie },
        payload: { stato: 'consegnato' },
      });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchSpy.mock.calls[1]![1].body).text).toContain('Consegnato');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('still creates the pratica when Slack is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    try {
      const res = await create({ ...NUOVA, ndg: 'SENZA-SLACK' });
      expect(res.statusCode).toBe(201);
      expect(res.json().pratica.ndg).toBe('SENZA-SLACK');
    } finally {
      vi.unstubAllGlobals();
    }
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
