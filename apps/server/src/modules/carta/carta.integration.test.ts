// Integration — letter templates over the emulator. The boundary that matters
// here is asymmetric: anyone holding the `carta` view must be able to READ the
// boilerplate (the view cannot produce a document without it), but only an
// admin may change it, because that text ends up in signed instruments.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import type { SnapshotCache } from '../../cache/index.js';
import { reseed, testDb } from '../../testSupport/emulator.js';
import { loginAs } from '../../testSupport/auth.js';
import { usersRepo } from '../../repositories/index.js';

const TEST_ENV = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo-pvp-dashboard',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
  PVPDASH_ENV: 'production',
  PVPDASH_LOG_LEVEL: 'silent',
  PVPDASH_META_POLL_SECONDS: '3600',
  PVPDASH_SESSION_TTL_DAYS: '30',
} satisfies NodeJS.ProcessEnv;

const TESTO = {
  apertura: 'Egregi Signori,',
  corpo: 'Importo {{IMPORTO}} entro {{SCADENZA}}.',
  chiusura: 'Distinti saluti.',
};

describe('carta templates (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;
  let adminCookie: string;

  beforeEach(async () => {
    await reseed();
    // `reseed` knows the seeded collections; `carta_template` is not one of
    // them, so overrides written by one test would survive into the next.
    // The first version of this suite did exactly that and a later test read
    // a template an earlier one had left behind.
    const rimasti = await testDb().collection('carta_template').get();
    await Promise.all(rimasti.docs.map((d) => d.ref.delete()));
    const anagrafiche = await testDb().collection('carta_anagrafica').get();
    await Promise.all(anagrafiche.docs.map((d) => d.ref.delete()));

    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
    adminCookie = await loginAs(app, 'admin', 'AdminPass123!');
  }, 30_000);

  afterEach(async () => {
    cache?.stopPolling();
    await app.close();
  });

  /** The fixture user carries must_change_password, which the auth plugin
   *  refuses before any permission is consulted — see the pratiche suite. */
  async function utenteConCarta(): Promise<string> {
    const u = await usersRepo.getByUsername(testDb(), 'mrossi');
    await testDb().collection('users').doc(u!.id).update({ must_change_password: false });
    await usersRepo.setViste(testDb(), u!.id, ['carta']);
    return loginAs(app, 'mrossi', 'UserPass123!');
  }

  const put = (tipo: string, body: unknown, cookie = adminCookie) =>
    app.inject({
      method: 'PUT',
      url: `/api/carta/templates/${tipo}`,
      headers: { cookie },
      payload: body as object,
    });

  it('returns nothing until something is overridden', async () => {
    // Absence means "use the text shipped in code" — nothing is pre-seeded,
    // so the defaults and the database cannot drift apart.
    const res = await app.inject({
      method: 'GET',
      url: '/api/carta/templates',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().templates).toEqual([]);
  });

  it('lets a non-admin holding the view READ the templates', async () => {
    const cookie = await utenteConCarta();
    const res = await app.inject({
      method: 'GET',
      url: '/api/carta/templates',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it('refuses a non-admin holding the view any WRITE', async () => {
    // Drafting a letter is not the same act as rewording the boilerplate
    // every future letter will carry.
    const cookie = await utenteConCarta();
    expect((await put('proposta', TESTO, cookie)).statusCode).toBe(403);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: '/api/carta/templates/proposta',
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(403);
  });

  it('saves an override and returns it in the list', async () => {
    expect((await put('proposta', TESTO)).statusCode).toBe(200);
    const lista = await app.inject({
      method: 'GET',
      url: '/api/carta/templates',
      headers: { cookie: adminCookie },
    });
    const t = lista.json().templates;
    expect(t).toHaveLength(1);
    expect(t[0].tipo).toBe('proposta');
    expect(t[0].corpo).toContain('{{IMPORTO}}');
    expect(t[0].updated_by).toBeTruthy();
  });

  it('keeps the body verbatim — spacing in legal text is deliberate', async () => {
    const conSpazi = { ...TESTO, corpo: '\n\n  Primo.\n\n\nSecondo.  \n' };
    const salvato = (await put('lettera', conSpazi)).json().template;
    expect(salvato.corpo).toBe(conSpazi.corpo);
  });

  it('refuses a document type that does not exist', async () => {
    expect((await put('inventato', TESTO)).statusCode).toBe(404);
  });

  it('resets back to the shipped text', async () => {
    await put('proposta', TESTO);
    const del = await app.inject({
      method: 'DELETE',
      url: '/api/carta/templates/proposta',
      headers: { cookie: adminCookie },
    });
    expect(del.statusCode).toBe(204);
    const lista = await app.inject({
      method: 'GET',
      url: '/api/carta/templates',
      headers: { cookie: adminCookie },
    });
    expect(lista.json().templates).toEqual([]);
  });

  // ── Signatories ──
  //
  // Same asymmetry as the templates, and for the same reason: the drafting
  // form has to read the list, but who may sign for the company is a
  // statement only an administrator gets to make.
  const ANAGRAFICA = {
    firmatari: [{ nome: 'Anna Bianchi', carica: 'Amministratore Unico', genere: 'F' }],
    qualifiche: ['Amministratore Unico'],
  };

  const putFirmatari = (body: unknown, cookie = adminCookie) =>
    app.inject({
      method: 'PUT',
      url: '/api/carta/firmatari',
      headers: { cookie },
      payload: body as object,
    });

  it('firmatari: absent until an admin customises the list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/carta/firmatari',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    // Null, not an echo of the shipped names: nothing is pre-seeded, so the
    // list in code and the one in the database cannot drift apart.
    expect(res.json().anagrafica).toBeNull();
  });

  it('firmatari: an admin sets the list, and the view reads it back', async () => {
    const res = await putFirmatari(ANAGRAFICA);
    expect(res.statusCode).toBe(200);
    expect(res.json().anagrafica.firmatari[0]).toMatchObject({
      nome: 'Anna Bianchi',
      genere: 'F',
    });

    const cookie = await utenteConCarta();
    const letto = await app.inject({
      method: 'GET',
      url: '/api/carta/firmatari',
      headers: { cookie },
    });
    expect(letto.statusCode).toBe(200);
    expect(letto.json().anagrafica.qualifiche).toEqual(['Amministratore Unico']);
  });

  it('firmatari: a non-admin holding the view cannot change who may sign', async () => {
    const cookie = await utenteConCarta();
    const res = await putFirmatari(ANAGRAFICA, cookie);
    expect(res.statusCode).toBe(403);

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/carta/firmatari',
      headers: { cookie },
    });
    expect(del.statusCode).toBe(403);
  });

  it('firmatari: an unknown gender is refused rather than stored', async () => {
    // It decides between "Il sottoscritto" and "La sottoscritta" in a legal
    // declaration; a value the document cannot render must not reach it.
    const res = await putFirmatari({
      firmatari: [{ nome: 'X', carica: 'Y', genere: 'Z' }],
      qualifiche: [],
    });
    expect(res.statusCode).toBe(400);
  });

  it('firmatari: reset drops the customisation', async () => {
    await putFirmatari(ANAGRAFICA);
    const del = await app.inject({
      method: 'DELETE',
      url: '/api/carta/firmatari',
      headers: { cookie: adminCookie },
    });
    expect(del.statusCode).toBe(204);

    const dopo = await app.inject({
      method: 'GET',
      url: '/api/carta/firmatari',
      headers: { cookie: adminCookie },
    });
    expect(dopo.json().anagrafica).toBeNull();
  });
});
