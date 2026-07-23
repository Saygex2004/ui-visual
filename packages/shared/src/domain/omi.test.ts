import { describe, it, expect } from 'vitest';
import { selectOmiEntry, omiSlug, slugComponent, type OmiDoc } from './omi.js';
import { OmiPriceSchema } from '../schemas/partA/omiPrice.js';
import { loadFixture } from '../__fixtures__/load.js';

const omiDocs = loadFixture<Array<{ id: string } & unknown[]>>('omi_prices.json');
const omiBySlug: Record<string, OmiDoc> = {};
for (const raw of omiDocs) {
  const parsed = OmiPriceSchema.parse(raw);
  omiBySlug[(raw as { id: string }).id] = parsed as unknown as OmiDoc;
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
