// Pure ratings-map accumulation (TESTING.md §6) — no React, no network.
import { describe, it, expect } from 'vitest';
import type { RatingDeltaEntry } from '@pvp/shared';
import { applyRatingsDelta, EMPTY_RATINGS_MAP } from './join.js';

function entry(overrides: Partial<RatingDeltaEntry>): RatingDeltaEntry {
  return {
    listing_id: '1001',
    value: 'ottimo_affare',
    set_by: 'user-1',
    set_at: '2026-07-02T09:00:00.000Z',
    ...overrides,
  };
}

describe('applyRatingsDelta', () => {
  it('adds a new entry to an empty map (present)', () => {
    const map = applyRatingsDelta(EMPTY_RATINGS_MAP, [entry({ listing_id: '1001' })]);
    expect(map.get('1001')).toBe('ottimo_affare');
  });

  it('overwrites an existing entry with a changed value', () => {
    const base = applyRatingsDelta(EMPTY_RATINGS_MAP, [
      entry({ listing_id: '1001', value: 'da_evitare' }),
    ]);
    const next = applyRatingsDelta(base, [entry({ listing_id: '1001', value: 'ottimo_affare' })]);
    expect(next.get('1001')).toBe('ottimo_affare');
  });

  it('removes an entry on a {value:null} tombstone (absent)', () => {
    const base = applyRatingsDelta(EMPTY_RATINGS_MAP, [entry({ listing_id: '1001' })]);
    const next = applyRatingsDelta(base, [
      { listing_id: '1001', value: null, set_by: null, set_at: null },
    ]);
    expect(next.has('1001')).toBe(false);
  });

  it('a tombstone for an id never present is a harmless no-op', () => {
    const next = applyRatingsDelta(EMPTY_RATINGS_MAP, [
      { listing_id: '9999', value: null, set_by: null, set_at: null },
    ]);
    expect(next.size).toBe(0);
  });

  it('leaves unrelated entries untouched', () => {
    const base = applyRatingsDelta(EMPTY_RATINGS_MAP, [
      entry({ listing_id: '1001', value: 'ottimo_affare' }),
      entry({ listing_id: '1002', value: 'da_verificare' }),
    ]);
    const next = applyRatingsDelta(base, [
      { listing_id: '1001', value: null, set_by: null, set_at: null },
    ]);
    expect(next.has('1001')).toBe(false);
    expect(next.get('1002')).toBe('da_verificare');
  });

  it('does not mutate the input map (pure)', () => {
    const base = applyRatingsDelta(EMPTY_RATINGS_MAP, [entry({ listing_id: '1001' })]);
    applyRatingsDelta(base, [entry({ listing_id: '1002', value: 'da_evitare' })]);
    expect(base.has('1002')).toBe(false);
  });
});
