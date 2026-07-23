import { describe, it, expect } from 'vitest';
import { bloccoKey, groupBlocchi } from './blocco.js';
import { ListingSchema } from '../schemas/partA/listing.js';
import { loadFixture } from '../__fixtures__/load.js';

const listings = loadFixture<unknown[]>('listings.json').map((l) => ListingSchema.parse(l));
const active = listings.filter((l) => l.archived_at === null);
const byId = (id: number) => listings.find((l) => l.id === id)!;

// Keys are derived from the fixtures via bloccoKey (the internal separator is an
// implementation detail — tests must not hardcode it).
const KEY_2LOT = bloccoKey(byId(1020))!;
const KEY_5LOT = bloccoKey(byId(1030))!;

describe('bloccoKey (DOMAIN_RULES §6)', () => {
  it('identical four-field tuples produce equal keys; a changed field differs', () => {
    expect(bloccoKey(byId(1020))).toBe(bloccoKey(byId(1021))); // same proceeding
    expect(bloccoKey(byId(1020))).not.toBe(bloccoKey(byId(1030))); // different proceeding
  });

  it('returns null when ANY of the four fields is null (never grouped)', () => {
    const base = { tipo_procedura: 'X', tribunale: 'Y', numero: '1', anno: '2020' };
    expect(bloccoKey(base)).not.toBeNull();
    expect(bloccoKey({ ...base, tipo_procedura: null })).toBeNull();
    expect(bloccoKey({ ...base, tribunale: null })).toBeNull();
    expect(bloccoKey({ ...base, numero: null })).toBeNull();
    expect(bloccoKey({ ...base, anno: null })).toBeNull();
  });
});

describe('groupBlocchi (DOMAIN_RULES §6)', () => {
  const index = groupBlocchi(active);

  it('groups exact-key matches; a 2-lot proceeding', () => {
    expect(index[KEY_2LOT]?.count).toBe(2);
    expect(index[KEY_2LOT]?.listing_ids.sort()).toEqual(['1020', '1021']);
  });

  it('count spans clusters within the area (a 5-lot proceeding)', () => {
    const entry = index[KEY_5LOT];
    expect(entry?.count).toBe(5);
    expect(entry?.listing_ids.sort()).toEqual(['1030', '1031', '1032', '1033', '1034']);
    // spans blue_chip, red, grey, black
    expect(new Set(entry?.clusters)).toEqual(new Set(['blue_chip', 'red', 'grey', 'black']));
  });

  it('never groups a listing with a null key field', () => {
    // Listing 1040 shares three fields with the 5-lot key but numero is null.
    const allGrouped = Object.values(index).flatMap((e) => e.listing_ids);
    expect(allGrouped).not.toContain('1040');
  });

  it('archived listings are not counted (caller passes the active set)', () => {
    // Listing 1050 (archived) shares the 2-lot key; excluded from `active`.
    expect(index[KEY_2LOT]?.listing_ids).not.toContain('1050');
    // Including it would raise the count — proving the filter is the caller's.
    const withArchived = groupBlocchi(listings);
    expect(withArchived[KEY_2LOT]?.count).toBe(3);
  });
});
