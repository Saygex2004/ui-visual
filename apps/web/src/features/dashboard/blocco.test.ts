// Blocco interactivity — pure helpers (UI §4.4, TESTING.md §6). Real fixture
// cases: Bari (count 2, spans only `red`) and Roma (count 5, spans
// `blue_chip/red/grey/black`) — see seed/fixtures/listings.json. Neither
// fixture group crosses exactly two clusters or a Principali/Fallimenti
// boundary, so the "direct jump, no chooser" and bucket-switch paths use a
// mocked entry instead (documented at each test).
import { describe, it, expect } from 'vitest';
import type { BloccoIndexEntry, ClusterBlock, ListingRow } from '@pvp/shared';
import { otherClusters, findBucketForBlocco } from './blocco.js';

function row(overrides: Partial<ListingRow>): ListingRow {
  return {
    id: '1',
    tipo_bene: 'Appartamento',
    tipo_procedura: 'Fallimentare',
    disponibilita: 'Libero',
    descrizione_excerpt: '',
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
    has_procedura_concorsuale: false,
    ...overrides,
  };
}

function cluster(overrides: Partial<ClusterBlock> & { key: string }): ClusterBlock {
  return {
    number: 1,
    name: 'Test cluster',
    buckets: { principali: [], fallimenti: [] },
    ...overrides,
  };
}

describe('otherClusters', () => {
  it('Bari (real fixture): count 2, a single cluster — no other cluster to jump to', () => {
    const entry: BloccoIndexEntry = { count: 2, listing_ids: ['b1', 'b2'], clusters: ['red'] };
    expect(otherClusters(entry, 'red')).toEqual([]);
  });

  it('Roma (real fixture): count 5 across 4 clusters — 3 others from any one of them', () => {
    const entry: BloccoIndexEntry = {
      count: 5,
      listing_ids: ['r1', 'r2', 'r3', 'r4', 'r5'],
      clusters: ['blue_chip', 'red', 'grey', 'black'],
    };
    expect(otherClusters(entry, 'blue_chip').sort()).toEqual(['black', 'grey', 'red']);
    expect(otherClusters(entry, 'black').sort()).toEqual(['blue_chip', 'grey', 'red']);
  });

  it('mocked 2-cluster case: exactly one other cluster (the direct-jump path, no chooser)', () => {
    const entry: BloccoIndexEntry = {
      count: 2,
      listing_ids: ['m1', 'm2'],
      clusters: ['red', 'green'],
    };
    expect(otherClusters(entry, 'red')).toEqual(['green']);
  });

  it('is empty when the current cluster is the only one on the entry (defensive)', () => {
    const entry: BloccoIndexEntry = {
      count: 3,
      listing_ids: ['x1', 'x2', 'x3'],
      clusters: ['green'],
    };
    expect(otherClusters(entry, 'green')).toEqual([]);
  });
});

describe('findBucketForBlocco', () => {
  it('finds a blocco in the Principali bucket', () => {
    const c = cluster({
      key: 'red',
      buckets: {
        principali: [row({ id: '1', blocco_key: 'proc-A' })],
        fallimenti: [],
      },
    });
    expect(findBucketForBlocco(c, 'proc-A')).toBe('principali');
  });

  it('finds a blocco in the Fallimenti bucket (mocked — no real fixture crosses buckets)', () => {
    const c = cluster({
      key: 'red',
      buckets: {
        principali: [],
        fallimenti: [row({ id: '2', blocco_key: 'proc-B' })],
      },
    });
    expect(findBucketForBlocco(c, 'proc-B')).toBe('fallimenti');
  });

  it('returns null when this cluster does not carry the block (stale URL, never throws)', () => {
    const c = cluster({
      key: 'red',
      buckets: { principali: [row({ id: '1', blocco_key: 'proc-A' })], fallimenti: [] },
    });
    expect(findBucketForBlocco(c, 'proc-Z')).toBeNull();
  });
});
