import { describe, it, expect } from 'vitest';
import { toListingRow, toOmiEntry, DESCRIZIONE_EXCERPT_MAX } from './rows.js';
import { bloccoKey, type Listing, type OmiPrice } from '@pvp/shared';

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
    const row = toListingRow(baseListing({ descrizione: long }));
    expect(row.descrizione_excerpt).toHaveLength(DESCRIZIONE_EXCERPT_MAX);
    expect(row.descrizione_excerpt).toBe(long.slice(0, DESCRIZIONE_EXCERPT_MAX));
  });

  it('leaves a short descrizione unchanged', () => {
    const row = toListingRow(baseListing({ descrizione: 'Breve.' }));
    expect(row.descrizione_excerpt).toBe('Breve.');
  });

  it('computes the blocco_key (via the shared bloccoKey rule, not a hardcoded separator) and band', () => {
    const fields = { tipo_procedura: 'P', tribunale: 'T', numero: '9', anno: '2026' };
    const row = toListingRow(baseListing({ ...fields, valore_richiesto: 0 }));
    expect(row.blocco_key).toBe(bloccoKey(fields));
    expect(row.band).toBe('bassa');
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
