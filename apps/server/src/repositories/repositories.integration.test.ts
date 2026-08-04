// Integration — repositories (TESTING.md §3). Seeded from the fixture set via
// @pvp/seed (the same code `pnpm seed` runs). Runs only against the emulator
// (guarded by vitest.integration.config.ts).
import { describe, it, expect, beforeAll } from 'vitest';
import * as listingsRepo from './listings.js';
import * as omiPricesRepo from './omiPrices.js';
import * as metaRepo from './meta.js';
import * as runsRepo from './runs.js';
import * as settingsRepo from './settings.js';
import * as procedureConcorsualiRepo from './procedureConcorsuali.js';
import { reseed, testDb } from '../testSupport/emulator.js';

beforeAll(async () => {
  await reseed();
}, 30_000);

describe('Part A repository surface is structurally read-only', () => {
  // No repository module may export anything that looks like a write
  // operation on a Part A collection (00_OVERVIEW.md §5) — the guarantee is
  // structural, asserted over the module's actual public surface. The ONE
  // deliberate exception (DATA_MODEL.md §7, UI §8.2): the
  // settings/extraction_categories write — named explicitly here, not
  // silently exempted, so this test still fails loud if a second write ever
  // appears anywhere in Part A.
  const FORBIDDEN_NAME = /^(create|update|delete|remove|write|set|put|save|upsert)/i;
  const partAModules: Record<string, Record<string, unknown>> = {
    listingsRepo,
    omiPricesRepo,
    metaRepo,
    runsRepo,
    settingsRepo,
    procedureConcorsualiRepo,
  };
  const ALLOWED_WRITE_EXPORTS = new Set(['settingsRepo.setExtractionCategories']);

  it('exports no write function for any Part A collection, except the one named exception', () => {
    for (const [moduleName, mod] of Object.entries(partAModules)) {
      for (const exportName of Object.keys(mod)) {
        const qualified = `${moduleName}.${exportName}`;
        if (ALLOWED_WRITE_EXPORTS.has(qualified)) continue;
        expect(FORBIDDEN_NAME.test(exportName), `${qualified} looks like a write function`).toBe(
          false,
        );
      }
    }
  });

  it('the one allowed exception still exists and is callable (guards a silent rename)', () => {
    for (const qualified of ALLOWED_WRITE_EXPORTS) {
      const [moduleName, exportName] = qualified.split('.') as [string, string];
      const mod = partAModules[moduleName];
      expect(mod, `unknown module ${moduleName} in ALLOWED_WRITE_EXPORTS`).toBeDefined();
      expect(typeof mod![exportName], `${qualified} should be a function`).toBe('function');
    }
  });
});

describe('listingsRepo (Part A, read-only)', () => {
  it('getByScope partitions active/archived and matches hand-counted fixture totals', async () => {
    const db = testDb();
    const immobili = await listingsRepo.getByScope(db, 'immobili');
    expect(immobili.active).toHaveLength(28);
    expect(immobili.archived).toHaveLength(2);

    const corporate = await listingsRepo.getByScope(db, 'corporate');
    expect(corporate.active).toHaveLength(6);
    expect(corporate.archived).toHaveLength(0);
  });

  it('every returned listing parses through the shared schema (scope-tagged correctly)', async () => {
    const db = testDb();
    const { active } = await listingsRepo.getByScope(db, 'corporate');
    expect(active.every((l) => l.scope === 'corporate')).toBe(true);
  });

  it('getById returns the full document, including an untrimmed HTML-hostile descrizione', async () => {
    const db = testDb();
    const listing = await listingsRepo.getById(db, '1055');
    expect(listing?.descrizione).toContain('<script>');
  });

  it('getById returns null for an unknown id', async () => {
    const db = testDb();
    expect(await listingsRepo.getById(db, '999999')).toBeNull();
  });
});

describe('omiPricesRepo (Part A, read-only)', () => {
  it('reads the full map, keyed by slug, error docs included', async () => {
    const map = await omiPricesRepo.getAllBySlug(testDb());
    expect(Object.keys(map).sort()).toEqual([
      'l-aquila-l-aquila',
      'milano-milano',
      'napoli-napoli',
      'roma-roma',
    ]);
    expect(map['napoli-napoli']?.error).not.toBeNull();
  });
});

describe('procedureConcorsualiRepo (Part A, read-only, no emulator seed fixture yet — Phase 14)', () => {
  it('returns an empty map against a collection with no documents, never throws', async () => {
    const map = await procedureConcorsualiRepo.getAllByKey(testDb());
    expect(map).toEqual({});
  });
});

describe('metaRepo (Part A, read-only, the cache-invalidation signal)', () => {
  it('reads the three well-known documents', async () => {
    const db = testDb();
    const immobili = await metaRepo.getScopeMeta(db, 'immobili');
    expect(immobili?.total_active).toBe(31);
    const omi = await metaRepo.getOmiMeta(db);
    expect(omi?.semestre).toBe('20252');
  });
});

describe('runsRepo (Part A, read-only, display-only audit trail)', () => {
  it('reads recent runs', async () => {
    const runs = await runsRepo.getRecent(testDb(), 10);
    expect(runs).toHaveLength(2);
  });
});

describe('settingsRepo (Part A — read side, plus the one deliberate write)', () => {
  it('reads the extraction-category selection', async () => {
    const selection = await settingsRepo.getExtractionCategories(testDb());
    expect(selection?.codes).toContain('LG');
    expect(selection?.updated_by).toBe('user-admin-1');
  });

  it('setExtractionCategories round-trips codes/updated_at/updated_by', async () => {
    const db = testDb();
    await settingsRepo.setExtractionCategories(db, {
      codes: ['FALL', 'NFAL', 'LG'],
      updatedBy: 'user-admin-1',
    });
    const selection = await settingsRepo.getExtractionCategories(db);
    expect(selection?.codes).toEqual(['FALL', 'NFAL', 'LG']);
    expect(selection?.updated_by).toBe('user-admin-1');
    expect(selection?.updated_at).toBeTruthy();
  });
});
