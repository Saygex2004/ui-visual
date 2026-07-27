// Same-session past-sale handling (UI §9.2/§9.3, DOMAIN_RULES.md §11,
// TESTING.md §6) — no React, no router, no server call of any kind.
import { describe, it, expect } from 'vitest';
import type { ClusterBlock, ListingRow } from '@pvp/shared';
import { computeSessionMoves, eligibleMoved, todayIso } from './sessionArchive.js';

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
    data_vendita: null,
    link: 'https://pvp.example/1',
    blocco_key: null,
    archived_at: null,
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

describe('todayIso', () => {
  it('returns a YYYY-MM-DD string matching the local calendar date', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayIso()).toBe(expected);
  });
});

describe('computeSessionMoves', () => {
  const TODAY = '2026-07-23';

  it('moves a row whose data_vendita is strictly before today, out of its bucket', () => {
    const clusters = [
      cluster({
        key: 'red',
        buckets: {
          principali: [row({ id: '1', data_vendita: '2026-07-22' })],
          fallimenti: [],
        },
      }),
    ];
    const result = computeSessionMoves(clusters, TODAY);
    expect(result.clusters[0]!.buckets.principali).toHaveLength(0);
    expect(result.moved.map((r) => r.id)).toEqual(['1']);
    expect(result.moved[0]!.cluster_key).toBe('red');
  });

  it('never moves a null data_vendita', () => {
    const clusters = [
      cluster({
        key: 'red',
        buckets: { principali: [row({ id: '1', data_vendita: null })], fallimenti: [] },
      }),
    ];
    const result = computeSessionMoves(clusters, TODAY);
    expect(result.clusters[0]!.buckets.principali).toHaveLength(1);
    expect(result.moved).toHaveLength(0);
  });

  it('keeps a row whose data_vendita is today or in the future', () => {
    const clusters = [
      cluster({
        key: 'red',
        buckets: {
          principali: [
            row({ id: '1', data_vendita: TODAY }),
            row({ id: '2', data_vendita: '2026-07-24' }),
          ],
          fallimenti: [],
        },
      }),
    ];
    const result = computeSessionMoves(clusters, TODAY);
    expect(result.clusters[0]!.buckets.principali.map((r) => r.id)).toEqual(['1', '2']);
    expect(result.moved).toHaveLength(0);
  });

  it('partitions both buckets independently and preserves other cluster fields', () => {
    const clusters = [
      cluster({
        key: 'blue_chip',
        number: 2,
        name: 'Blue Chip Zone',
        buckets: {
          principali: [row({ id: '1', data_vendita: '2026-01-01' })],
          fallimenti: [row({ id: '2', data_vendita: '2026-01-01' }), row({ id: '3' })],
        },
      }),
    ];
    const result = computeSessionMoves(clusters, TODAY);
    expect(result.clusters[0]!.number).toBe(2);
    expect(result.clusters[0]!.name).toBe('Blue Chip Zone');
    expect(result.clusters[0]!.buckets.principali).toHaveLength(0);
    expect(result.clusters[0]!.buckets.fallimenti.map((r) => r.id)).toEqual(['3']);
    expect(result.moved.map((r) => r.id).sort()).toEqual(['1', '2']);
  });

  it('collects moves across multiple clusters, each tagged with its own cluster_key', () => {
    const clusters = [
      cluster({
        key: 'red',
        buckets: { principali: [row({ id: '1', data_vendita: '2026-01-01' })], fallimenti: [] },
      }),
      cluster({
        key: 'grey',
        number: 4,
        buckets: { principali: [row({ id: '2', data_vendita: '2026-01-01' })], fallimenti: [] },
      }),
    ];
    const result = computeSessionMoves(clusters, TODAY);
    const byId = Object.fromEntries(result.moved.map((r) => [r.id, r.cluster_key]));
    expect(byId).toEqual({ '1': 'red', '2': 'grey' });
  });
});

describe('eligibleMoved', () => {
  it('excludes cleared ids and keeps the rest', () => {
    const moved = [
      row({ id: '1', data_vendita: '2026-01-01' }),
      row({ id: '2', data_vendita: '2026-01-01' }),
    ].map((r) => ({ ...r, cluster_key: 'red' }));
    expect(eligibleMoved(moved, new Set(['1'])).map((r) => r.id)).toEqual(['2']);
  });

  it('returns everything when nothing is cleared', () => {
    const moved = [row({ id: '1', data_vendita: '2026-01-01' })].map((r) => ({
      ...r,
      cluster_key: 'red',
    }));
    expect(eligibleMoved(moved, new Set())).toHaveLength(1);
  });
});
