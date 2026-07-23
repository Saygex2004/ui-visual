import { describe, it, expect } from 'vitest';
import { ListingSchema } from './partA/listing.js';
import { OmiPriceSchema } from './partA/omiPrice.js';
import { ScopeMetaSchema, OmiMetaSchema } from './partA/meta.js';
import { RunSchema } from './partA/run.js';
import { ExtractionCategoriesSchema } from './partA/extractionCategories.js';
import { loadFixture } from '../__fixtures__/load.js';

describe('Part A schemas (DATA_MODEL §§3–7)', () => {
  it('every fixture listing parses through ListingSchema', () => {
    const listings = loadFixture<unknown[]>('listings.json');
    expect(listings.length).toBeGreaterThan(0);
    for (const l of listings) {
      expect(() => ListingSchema.parse(l)).not.toThrow();
    }
  });

  it('tolerates unknown extra fields (passthrough, additive scraper changes)', () => {
    const base = ListingSchema.parse(loadFixture<unknown[]>('listings.json')[0]);
    const withExtra = { ...base, brand_new_scraper_field: 'ignore me', another: 42 };
    const parsed = ListingSchema.parse(withExtra);
    expect((parsed as Record<string, unknown>).brand_new_scraper_field).toBe('ignore me');
  });

  it('content_hash is present but opaque (a plain string)', () => {
    const l = ListingSchema.parse(loadFixture<unknown[]>('listings.json')[0]);
    expect(typeof l.content_hash).toBe('string');
  });

  it('valore_richiesto tolerates 0 and null (zero is a value, not a gap)', () => {
    const listings = loadFixture<Array<{ id: number }>>('listings.json').map((l) =>
      ListingSchema.parse(l),
    );
    expect(listings.find((l) => l.id === 1006)?.valore_richiesto).toBe(0);
    expect(listings.find((l) => l.id === 1004)?.valore_richiesto).toBeNull();
  });

  it('omi_prices parse; error doc has null data fields', () => {
    const docs = loadFixture<unknown[]>('omi_prices.json');
    for (const d of docs) expect(() => OmiPriceSchema.parse(d)).not.toThrow();
    const err = docs.map((d) => OmiPriceSchema.parse(d)).find((d) => d.error !== null);
    expect(err?.min_mq).toBeNull();
    expect(err?.max_mq).toBeNull();
  });

  it('the three meta documents parse (scope shape + omi shape)', () => {
    const meta = loadFixture<Record<string, unknown>>('meta.json');
    expect(() => ScopeMetaSchema.parse(meta.immobili)).not.toThrow();
    expect(() => ScopeMetaSchema.parse(meta.corporate)).not.toThrow();
    expect(() => OmiMetaSchema.parse(meta.omi)).not.toThrow();
  });

  it('runs parse (display-only audit trail)', () => {
    for (const r of loadFixture<unknown[]>('runs.json')) {
      expect(() => RunSchema.parse(r)).not.toThrow();
    }
  });

  it('settings/extraction_categories parses', () => {
    const settings = loadFixture<{ extraction_categories: unknown }>('settings.json');
    expect(() => ExtractionCategoriesSchema.parse(settings.extraction_categories)).not.toThrow();
  });
});
