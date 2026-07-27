import { describe, it, expect } from 'vitest';
import {
  selectOmiEntry,
  selectOmiDisplayEntry,
  omiSlug,
  slugComponent,
  type OmiDoc,
  type OmiDisplayDoc,
} from './omi.js';
import { OmiPriceSchema } from '../schemas/partA/omiPrice.js';
import { loadFixture } from '../__fixtures__/load.js';

const omiDocs = loadFixture<Array<{ id: string } & unknown[]>>('omi_prices.json');
const omiBySlug: Record<string, OmiDoc> = {};
// The client-shape mirror — `available = error === null`, exactly what the
// server's own `toOmiEntry` does before a snapshot ships (apps/server/src/
// cache/rows.ts), so this test fixture matches what the browser actually gets.
const omiByComune: Record<string, OmiDisplayDoc> = {};
for (const raw of omiDocs) {
  const parsed = OmiPriceSchema.parse(raw);
  const id = (raw as { id: string }).id;
  omiBySlug[id] = parsed as unknown as OmiDoc;
  const { error, ...rest } = parsed as unknown as OmiDoc;
  omiByComune[id] = { ...rest, available: error === null };
}

describe('omiSlug / slugComponent (DATA_MODEL §4)', () => {
  it('lowercases, strips accents, collapses non-alnum to hyphens', () => {
    expect(slugComponent("L'Aquila")).toBe('l-aquila');
    expect(slugComponent('Reggio Emilia')).toBe('reggio-emilia');
    expect(slugComponent('Forlì')).toBe('forli');
  });

  it('composes {slug(provincia)}-{slug(comune)}', () => {
    expect(omiSlug('Roma', 'Roma')).toBe('roma-roma');
    expect(omiSlug("L'Aquila", "L'Aquila")).toBe('l-aquila-l-aquila');
  });
});

describe('selectOmiEntry (DOMAIN_RULES §9)', () => {
  it('province/capital comune: returns that comune document', () => {
    const entry = selectOmiEntry(omiBySlug, { provincia: 'Roma', comune: 'Roma' });
    expect(entry?.available).toBe(true);
    expect(entry?.min_mq).toBe(2800);
    expect(entry?.zona).toBe('Centro Storico');
  });

  it('listing comune absent → falls back to the province capital', () => {
    // Roccaraso (comune) has no OMI doc; L'Aquila (capital) does.
    const entry = selectOmiEntry(omiBySlug, {
      provincia: "L'Aquila",
      comune: 'Roccaraso',
      capitalComune: "L'Aquila",
    });
    expect(entry?.comune).toBe("L'Aquila");
    expect(entry?.available).toBe(true);
  });

  it('error document → "not available" (null), no fallback data leaked', () => {
    const entry = selectOmiEntry(omiBySlug, { provincia: 'Napoli', comune: 'Napoli' });
    expect(entry).toBeNull();
  });

  it('absent document (no data at all) → "not available" (null)', () => {
    const entry = selectOmiEntry(omiBySlug, { provincia: 'Chieti', comune: 'Chieti' });
    expect(entry).toBeNull();
  });

  it('null province → null (cannot key)', () => {
    expect(selectOmiEntry(omiBySlug, { provincia: null, comune: 'Roma' })).toBeNull();
  });
});

describe('selectOmiDisplayEntry (client shape — DOMAIN_RULES §9)', () => {
  it('province/capital comune: returns that comune document', () => {
    const entry = selectOmiDisplayEntry(omiByComune, { provincia: 'Roma', comune: 'Roma' });
    expect(entry?.available).toBe(true);
    expect(entry?.min_mq).toBe(2800);
    expect(entry?.zona).toBe('Centro Storico');
  });

  it('listing comune absent → falls back to the province capital', () => {
    const entry = selectOmiDisplayEntry(omiByComune, {
      provincia: "L'Aquila",
      comune: 'Roccaraso',
      capitalComune: "L'Aquila",
    });
    expect(entry?.comune).toBe("L'Aquila");
    expect(entry?.available).toBe(true);
  });

  it('unavailable document → null, no fallback data leaked', () => {
    const entry = selectOmiDisplayEntry(omiByComune, { provincia: 'Napoli', comune: 'Napoli' });
    expect(entry).toBeNull();
  });

  it('absent document (no data at all) → null', () => {
    const entry = selectOmiDisplayEntry(omiByComune, { provincia: 'Chieti', comune: 'Chieti' });
    expect(entry).toBeNull();
  });

  it('null province → null (cannot key)', () => {
    expect(selectOmiDisplayEntry(omiByComune, { provincia: null, comune: 'Roma' })).toBeNull();
  });
});
