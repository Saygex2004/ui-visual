// Pure filter/sort logic (UI §4.2, TESTING.md §6) — no React, no router.
import { describe, it, expect } from 'vitest';
import type { ListingRow } from '@pvp/shared';
import { applyFilterModel, distinctValues } from './filterModel.js';
import type { AreaSearch } from './urlState.js';

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

const baseSearch: AreaSearch = { cluster: 1, tab: 'principali', dir: 'asc' };

describe('applyFilterModel', () => {
  const rows: ListingRow[] = [
    row({
      id: '1',
      tipo_bene: 'Appartamento',
      valore_richiesto: 100000,
      data_pubblicazione: '2024-01-01',
    }),
    row({
      id: '2',
      tipo_bene: 'Villa',
      valore_richiesto: 500000,
      data_pubblicazione: '2024-03-01',
      tribunale: 'Tribunale di Milano',
    }),
    row({
      id: '3',
      tipo_bene: 'Terreno',
      valore_richiesto: null,
      data_pubblicazione: null,
      disponibilita: 'Occupato',
    }),
  ];

  it('returns every row unfiltered when the search has no active filters', () => {
    const result = applyFilterModel(rows, baseSearch);
    expect(result.visibleCount).toBe(3);
    expect(result.totalCount).toBe(3);
  });

  it('matches free text anywhere in the row, case-insensitively', () => {
    const result = applyFilterModel(rows, { ...baseSearch, q: 'VILLA' });
    expect(result.rows.map((r) => r.id)).toEqual(['2']);
  });

  it('filters by exact tipo match', () => {
    const result = applyFilterModel(rows, { ...baseSearch, tipo: 'Terreno' });
    expect(result.rows.map((r) => r.id)).toEqual(['3']);
  });

  it('filters by exact tribunale match', () => {
    const result = applyFilterModel(rows, { ...baseSearch, tribunale: 'Tribunale di Milano' });
    expect(result.rows.map((r) => r.id)).toEqual(['2']);
  });

  it('filters by exact disponibilita match', () => {
    const result = applyFilterModel(rows, { ...baseSearch, disponibilita: 'Occupato' });
    expect(result.rows.map((r) => r.id)).toEqual(['3']);
  });

  it('excludes rows with a null value from an active min/max range', () => {
    const result = applyFilterModel(rows, { ...baseSearch, min: 0 });
    expect(result.rows.map((r) => r.id)).toEqual(['1', '2']);
  });

  it('applies min and max together', () => {
    const result = applyFilterModel(rows, { ...baseSearch, min: 200000, max: 600000 });
    expect(result.rows.map((r) => r.id)).toEqual(['2']);
  });

  it('AND-composes multiple active filters', () => {
    const result = applyFilterModel(rows, { ...baseSearch, tipo: 'Villa', min: 0, max: 100000 });
    expect(result.rows).toHaveLength(0);
  });

  it('sorts by valore ascending with nulls lowest', () => {
    const result = applyFilterModel(rows, { ...baseSearch, sort: 'valore', dir: 'asc' });
    expect(result.rows.map((r) => r.id)).toEqual(['3', '1', '2']);
  });

  it('sorts by valore descending', () => {
    const result = applyFilterModel(rows, { ...baseSearch, sort: 'valore', dir: 'desc' });
    expect(result.rows.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by data_pubblicazione with nulls lowest', () => {
    const result = applyFilterModel(rows, { ...baseSearch, sort: 'pubblicazione', dir: 'asc' });
    expect(result.rows.map((r) => r.id)).toEqual(['3', '1', '2']);
  });

  it('honours the reserved blocco isolation key (Phase 5 wires the click)', () => {
    const withBlocco = [
      row({ id: '10', blocco_key: 'proc-A' }),
      row({ id: '11', blocco_key: 'proc-A' }),
      row({ id: '12', blocco_key: 'proc-B' }),
    ];
    const result = applyFilterModel(withBlocco, { ...baseSearch, blocco: 'proc-A' });
    expect(result.rows.map((r) => r.id)).toEqual(['10', '11']);
  });
});

describe('distinctValues', () => {
  it('returns sorted, de-duplicated, non-empty values for a field', () => {
    const rows: ListingRow[] = [
      row({ tipo_bene: 'Villa' }),
      row({ tipo_bene: 'Appartamento' }),
      row({ tipo_bene: 'Villa' }),
    ];
    expect(distinctValues(rows, 'tipo_bene')).toEqual(['Appartamento', 'Villa']);
  });

  it('excludes null values', () => {
    const rows: ListingRow[] = [row({ tribunale: null }), row({ tribunale: 'Tribunale di Bari' })];
    expect(distinctValues(rows, 'tribunale')).toEqual(['Tribunale di Bari']);
  });
});
