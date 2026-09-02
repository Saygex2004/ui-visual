import { describe, it, expect } from 'vitest';
import { toListingRow, toOmiEntry, DESCRIZIONE_EXCERPT_MAX } from './rows.js';
import { bloccoKey, type Listing, type OmiPrice, type ProceduraConcorsualeDoc } from '@pvp/shared';

const NO_PROCEDURE: Record<string, ProceduraConcorsualeDoc> = {};

function baseListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 1,
    scope: 'immobili',
    tipo_bene: 'Appartamento',
    cod_tipo_categ_lotto: null,
    tipo_procedura: 'X',
    cod_tipo_rito: null,
    cod_tipo_registro: null,
    numero: '1',
    anno: '2026',
    tribunale: 'Tribunale di Test',
    valore_richiesto: 100,
    data_pubblicazione: '2026-01-01',
    data_vendita: '2026-06-01',
    regione: 'Lazio',
    provincia: 'Roma',
    comune: 'Roma',
    link: 'https://example.test/1',
    disponibilita: 'Libero',
    descrizione: '',
    allegati: [],
    archived_at: null,
    first_seen_at: '2026-01-01T00:00:00.000Z',
    last_seen_at: '2026-01-01T00:00:00.000Z',
    content_hash: 'h',
    ...overrides,
  };
}

describe('toListingRow (API_CONTRACT.md section 3 - descrizione excerpt)', () => {
  it(`trims a long descrizione to ${DESCRIZIONE_EXCERPT_MAX} characters`, () => {
    const long = 'x'.repeat(500);
    const row = toListingRow(baseListing({ descrizione: long }), NO_PROCEDURE);
    expect(row.descrizione_excerpt).toHaveLength(DESCRIZIONE_EXCERPT_MAX);
    expect(row.descrizione_excerpt).toBe(long.slice(0, DESCRIZIONE_EXCERPT_MAX));
  });

  it('leaves a short descrizione unchanged', () => {
    const row = toListingRow(baseListing({ descrizione: 'Breve.' }), NO_PROCEDURE);
    expect(row.descrizione_excerpt).toBe('Breve.');
  });

  it('computes the blocco_key (via the shared bloccoKey rule, not a hardcoded separator) and band', () => {
    const fields = { tipo_procedura: 'P', tribunale: 'T', numero: '9', anno: '2026' };
    const row = toListingRow(baseListing({ ...fields, valore_richiesto: 0 }), NO_PROCEDURE);
    expect(row.blocco_key).toBe(bloccoKey(fields));
    expect(row.band).toBe('bassa');
  });
});

describe('toListingRow — has_procedura_concorsuale (DOMAIN_RULES.md section 12)', () => {
  it('false when no matching procedure exists in the map', () => {
    const row = toListingRow(baseListing(), NO_PROCEDURE);
    expect(row.has_procedura_concorsuale).toBe(false);
  });

  it('true when the listing key matches a procedure in the map, regardless of scheda_letta_il', () => {
    const listing = baseListing({
      tribunale: 'Tribunale di Modena',
      numero: '76',
      anno: '2021',
      tipo_procedura: 'Fallimentare (nuovo Rito)',
    });
    const byKey: Record<string, ProceduraConcorsualeDoc> = {
      'MODENA 76 2021 F': {
        id: 'x',
        nome: 'Test',
        rg: { completo: '76/2021', numero: '76', numero_base: '76', anno: 2021 },
        data_dichiarazione: null,
        tipo_code: 'F',
        tipo_procedura: 'Fallimento',
        tribunale: { nome: 'Modena', chiave: 'MODENA' },
        professionista: null,
        giudice_delegato: null,
        debitore: null,
        link: 'https://example.test',
        estratto_il: '2026-01-01T00:00:00.000Z',
        scheda_letta_il: null,
      },
    };
    expect(toListingRow(listing, byKey).has_procedura_concorsuale).toBe(true);
  });

  it('false for a concordato preventivo that merely shares the number', () => {
    // The bug this key shape exists to prevent: the two registers number
    // independently, so a concordato 76/2021 in Modena is not the fallimento
    // 76/2021 in Modena — it is another company entirely.
    const concordato = baseListing({
      tribunale: 'Tribunale di Modena',
      numero: '76',
      anno: '2021',
      tipo_procedura: 'Nuovo Concordato Preventivo',
    });
    const byKey: Record<string, ProceduraConcorsualeDoc> = {
      'MODENA 76 2021 F': {
        id: 'x',
        nome: 'Altra Societa Srl',
        rg: { completo: '76/2021', numero: '76', numero_base: '76', anno: 2021 },
        data_dichiarazione: null,
        tipo_code: 'F',
        tipo_procedura: 'Fallimento',
        tribunale: { nome: 'Modena', chiave: 'MODENA' },
        professionista: null,
        giudice_delegato: null,
        debitore: null,
        link: 'https://example.test',
        estratto_il: '2026-01-01T00:00:00.000Z',
        scheda_letta_il: null,
      },
    };
    expect(toListingRow(concordato, byKey).has_procedura_concorsuale).toBe(false);
  });
});

describe('toOmiEntry (DOMAIN_RULES.md section 9)', () => {
  it('available: true when error is null', () => {
    const doc: OmiPrice = {
      provincia: 'Roma',
      comune: 'Roma',
      tipologia: 'Abitazioni civili',
      stato: 'NORMALE',
      min_mq: 100,
      max_mq: 200,
      zona: 'Centro',
      semestre: '20252',
      fetched_at: '2026-01-01T00:00:00.000Z',
      error: null,
    };
    expect(toOmiEntry(doc).available).toBe(true);
  });

  it('available: false when error is set (data fields still carried, all null)', () => {
    const doc: OmiPrice = {
      provincia: 'Roma',
      comune: 'Roma',
      tipologia: null,
      stato: null,
      min_mq: null,
      max_mq: null,
      zona: null,
      semestre: '20252',
      fetched_at: '2026-01-01T00:00:00.000Z',
      error: 'boom',
    };
    expect(toOmiEntry(doc).available).toBe(false);
  });
});
