// URL search-param contract (FRONTEND.md §2, TESTING.md §6): every field
// falls back to a default on missing/invalid input — a stale or hand-edited
// link must never fail to parse.
import { describe, it, expect } from 'vitest';
import { areaSearchSchema, listingSearchSchema, resolveClusterSelector } from './urlState.js';

describe('areaSearchSchema', () => {
  it('fills every default from an empty object', () => {
    const result = areaSearchSchema.parse({});
    expect(result).toEqual({ cluster: 1, tab: 'principali', dir: 'asc' });
  });

  it('round-trips a fully populated, valid search', () => {
    const input = {
      cluster: 3,
      tab: 'fallimenti',
      q: 'roma',
      tipo: 'Appartamento',
      procedura: 'Fallimentare',
      disponibilita: 'Libero',
      tribunale: 'Tribunale di Roma',
      min: 100000,
      max: 500000,
      sort: 'valore',
      dir: 'desc',
      regione: 'Lazio',
      capoluogo: 'Roma',
      provincia: 'Roma',
      blocco: 'some-key',
    };
    expect(areaSearchSchema.parse(input)).toEqual(input);
  });

  it('accepts the archivio cluster selector literally', () => {
    expect(areaSearchSchema.parse({ cluster: 'archivio' }).cluster).toBe('archivio');
  });

  it.each([
    ['a non-numeric, non-archivio cluster', { cluster: 'not-a-number' }, 1],
    ['a negative cluster number', { cluster: -3 }, 1],
    ['a zero cluster number', { cluster: 0 }, 1],
  ])('falls back to cluster 1 for %s', (_label, input, expected) => {
    expect(areaSearchSchema.parse(input).cluster).toBe(expected);
  });

  it('falls back tab to principali on an unrecognized value', () => {
    expect(areaSearchSchema.parse({ tab: 'not-a-bucket' }).tab).toBe('principali');
  });

  it('drops an unrecognized occupancy value rather than erroring', () => {
    const result = areaSearchSchema.parse({ disponibilita: 'not-a-real-status' });
    expect(result.disponibilita).toBeUndefined();
  });

  it('drops a non-numeric min/max rather than erroring', () => {
    const result = areaSearchSchema.parse({ min: 'abc', max: 'xyz' });
    expect(result.min).toBeUndefined();
    expect(result.max).toBeUndefined();
  });

  it('coerces numeric strings for min/max (raw URLSearchParams values)', () => {
    const result = areaSearchSchema.parse({ min: '1000', max: '2000' });
    expect(result).toMatchObject({ min: 1000, max: 2000 });
  });

  it('falls back dir to asc on an unrecognized value', () => {
    expect(areaSearchSchema.parse({ dir: 'sideways' }).dir).toBe('asc');
  });

  it('never throws on a completely malformed input', () => {
    expect(() =>
      areaSearchSchema.parse({
        cluster: { nested: 'object' },
        tab: 42,
        min: 'not-a-number',
        disponibilita: ['array', 'not', 'string'],
      }),
    ).not.toThrow();
  });
});

describe('listingSearchSchema', () => {
  it('extends the area schema with pannello, defaulting to dettagli', () => {
    const result = listingSearchSchema.parse({});
    expect(result).toEqual({ cluster: 1, tab: 'principali', dir: 'asc', pannello: 'dettagli' });
  });

  it('falls back an unrecognized pannello to dettagli', () => {
    expect(listingSearchSchema.parse({ pannello: 'not-a-panel' }).pannello).toBe('dettagli');
  });

  it('accepts each valid pannello value', () => {
    for (const value of ['dettagli', 'storico', 'chat']) {
      expect(listingSearchSchema.parse({ pannello: value }).pannello).toBe(value);
    }
  });
});

describe('resolveClusterSelector', () => {
  it('passes archivio through unchanged', () => {
    expect(resolveClusterSelector('archivio', 5)).toBe('archivio');
  });

  it('passes an in-range cluster number through unchanged', () => {
    expect(resolveClusterSelector(3, 5)).toBe(3);
  });

  it('clamps an out-of-range cluster number to 1', () => {
    expect(resolveClusterSelector(99, 5)).toBe(1);
    expect(resolveClusterSelector(0, 5)).toBe(1);
  });
});
