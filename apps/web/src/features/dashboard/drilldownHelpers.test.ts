// Geographic drill-down helpers (UI §3.2, TESTING.md §6) — no React, no router.
import { describe, it, expect } from 'vitest';
import type { ListingRow } from '@pvp/shared';
import {
  regionsPresent,
  rowsForRegion,
  capitalsPresent,
  provincesPresent,
  capitalComuneForProvince,
} from './drilldownHelpers.js';

function row(overrides: Partial<ListingRow>): ListingRow {
  return {
    id: '1',
    tipo_bene: 'Appartamento',
    tipo_procedura: 'Fallimentare',
    disponibilita: 'Libero',
    descrizione_excerpt: 'Un appartamento luminoso',
    numero: '10',
    anno: '2024',
    tribunale: 'Tribunale di Roma',
    regione: 'Lazio',
    provincia: 'Roma',
    comune: 'Roma',
    valore_richiesto: 100000,
    band: 'media',
    data_pubblicazione: '2024-01-01',
    data_vendita: '2024-06-01',
    link: 'https://pvp.example/1',
    blocco_key: null,
    archived_at: null,
    ...overrides,
  };
}

// Mirrors the real fixture shape: Lazio (Roma capital + Tivoli non-capital)
// and Puglia (Bari capital + Modugno non-capital), plus a null-region row
// (as the Black Zone catch-all would carry).
const rows: ListingRow[] = [
  row({ id: '1', regione: 'Lazio', provincia: 'Roma', comune: 'Roma' }),
  row({ id: '2', regione: 'Lazio', provincia: 'Roma', comune: 'Tivoli' }),
  row({ id: '3', regione: 'Puglia', provincia: 'Bari', comune: 'Bari' }),
  row({ id: '4', regione: 'Puglia', provincia: 'Bari', comune: 'Modugno' }),
  row({ id: '5', regione: null, provincia: null, comune: null }),
];

describe('regionsPresent', () => {
  it('returns distinct, sorted, non-null regions', () => {
    expect(regionsPresent(rows)).toEqual(['Lazio', 'Puglia']);
  });

  it('is empty for an all-null-region row set', () => {
    expect(regionsPresent([row({ regione: null })])).toEqual([]);
  });
});

describe('rowsForRegion', () => {
  it('returns only the rows for the requested region', () => {
    expect(rowsForRegion(rows, 'Puglia').map((r) => r.id)).toEqual(['3', '4']);
  });

  it('returns an empty array for a region with no rows', () => {
    expect(rowsForRegion(rows, 'Lombardia')).toEqual([]);
  });
});

describe('capitalsPresent', () => {
  it('identifies capitals by comune === provincia, from the rows themselves', () => {
    const lazio = rowsForRegion(rows, 'Lazio');
    expect(capitalsPresent(lazio)).toEqual(['Roma']);
  });

  it('excludes non-capital comuni even in the same province', () => {
    const puglia = rowsForRegion(rows, 'Puglia');
    expect(capitalsPresent(puglia)).toEqual(['Bari']);
    expect(capitalsPresent(puglia)).not.toContain('Modugno');
  });

  it('is empty when no row in the set is a capital', () => {
    const nonCapitalOnly = [row({ regione: 'Lazio', provincia: 'Roma', comune: 'Tivoli' })];
    expect(capitalsPresent(nonCapitalOnly)).toEqual([]);
  });
});

describe('provincesPresent', () => {
  it('returns distinct, sorted provinces (capital and non-capital rows alike)', () => {
    const lazio = rowsForRegion(rows, 'Lazio');
    expect(provincesPresent(lazio)).toEqual(['Roma']);
  });

  it('lists every distinct province across multiple', () => {
    const multi = [
      row({ regione: 'Lazio', provincia: 'Roma', comune: 'Tivoli' }),
      row({ regione: 'Lazio', provincia: 'Frosinone', comune: 'Frosinone' }),
    ];
    expect(provincesPresent(multi)).toEqual(['Frosinone', 'Roma']);
  });
});

describe('capitalComuneForProvince', () => {
  it('returns the capital comune actually present for that province', () => {
    expect(capitalComuneForProvince(rows, 'Roma')).toBe('Roma');
    expect(capitalComuneForProvince(rows, 'Bari')).toBe('Bari');
  });

  it('returns null when the province has no capital row present (never guessed)', () => {
    const capitalLess = [row({ regione: 'Lazio', provincia: 'Frosinone', comune: 'Anagni' })];
    expect(capitalComuneForProvince(capitalLess, 'Frosinone')).toBeNull();
  });

  it('returns null for a province absent from the row set entirely', () => {
    expect(capitalComuneForProvince(rows, 'Milano')).toBeNull();
  });
});
