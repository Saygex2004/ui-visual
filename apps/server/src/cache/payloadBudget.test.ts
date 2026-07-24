// Payload-budget test (TESTING.md §4, API_CONTRACT.md §3): a 10k-listing
// synthetic snapshot must serialize under the gzipped-size budget and within a
// latency bound. Pure offline unit test — `assembleSnapshot` takes in-memory
// inputs only, so this needs no emulator: we generate the synthetic set
// directly (from fixture-shaped templates) rather than seeding 10k Firestore
// documents just to measure a payload size.
import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { RECOGNIZED_REGIONS, type Scope } from '@pvp/shared';
import { buildSyntheticListings } from '@pvp/shared/testing';
import { assembleSnapshot, type ScopeMetaInput } from './build.js';

const LISTING_COUNT = 10_000;
// API_CONTRACT.md §3: "Target: a 10k-listing snapshot ≤ ~3 MB gzipped".
const BUDGET_BYTES_GZIPPED = 3 * 1024 * 1024;
// No exact figure is fixed in the spec for serialization latency; this is a
// generous ceiling — actual numbers are recorded in the Phase 2 handoff.
const SERIALIZE_LATENCY_BUDGET_MS = 500;

function buildSyntheticOmiMap(): Record<
  string,
  {
    provincia: string;
    comune: string;
    tipologia: string | null;
    stato: string | null;
    min_mq: number | null;
    max_mq: number | null;
    zona: string | null;
    semestre: string;
    fetched_at: string;
    error: string | null;
  }
> {
  const map: ReturnType<typeof buildSyntheticOmiMap> = {};
  for (const region of RECOGNIZED_REGIONS) {
    const comune = `Comune di ${region}`;
    const slug = `provincia-di-${region.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-comune-di-${region
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`;
    map[slug] = {
      provincia: `Provincia di ${region}`,
      comune,
      tipologia: 'Abitazioni civili',
      stato: 'NORMALE',
      min_mq: 800,
      max_mq: 2500,
      zona: 'Centro',
      semestre: '20252',
      fetched_at: '2026-06-30T12:00:00.000Z',
      error: null,
    };
  }
  return map;
}

describe('AreaSnapshot payload budget (10k listings, API_CONTRACT.md §3)', () => {
  const scope: Scope = 'immobili';
  const listings = buildSyntheticListings(LISTING_COUNT, 'payload-budget-fixed-seed');
  const active = listings.filter((l) => l.archived_at === null);
  const archived = listings.filter((l) => l.archived_at !== null);
  const omiMap = buildSyntheticOmiMap();
  const scopeMeta: ScopeMetaInput = {
    last_success_at: '2026-07-01T06:00:00.000Z',
    total_active: active.length,
    total_stored: listings.length,
    detail_errors: 0,
  };
  const omiMeta = { fetched_at: '2026-06-30T12:00:00.000Z', semestre: '20252' };

  it(`assembles ${LISTING_COUNT} listings into a snapshot`, () => {
    const { snapshot } = assembleSnapshot(scope, active, archived, omiMap, scopeMeta, omiMeta);
    const totalRows = snapshot.clusters.reduce(
      (n, c) => n + c.buckets.principali.length + c.buckets.fallimenti.length,
      0,
    );
    // totalRows + archive + excluded (dropped, not in any cluster) === active.length
    expect(totalRows + snapshot.archive.length).toBeLessThanOrEqual(listings.length);
    expect(snapshot.archive).toHaveLength(archived.length);
  });

  it(`serializes under the ${(BUDGET_BYTES_GZIPPED / 1024 / 1024).toFixed(1)} MB gzipped budget, within the latency bound`, () => {
    const { snapshot } = assembleSnapshot(scope, active, archived, omiMap, scopeMeta, omiMeta);

    const serializeStart = performance.now();
    const json = JSON.stringify(snapshot);
    const serializeMs = performance.now() - serializeStart;

    const gzipped = gzipSync(Buffer.from(json, 'utf8'));

    // Recorded in the Phase 2 handoff — not asserted beyond the budgets below.
    console.log(
      `[payload-budget] raw=${(json.length / 1024 / 1024).toFixed(2)}MB ` +
        `gzip=${(gzipped.length / 1024 / 1024).toFixed(2)}MB ` +
        `serialize=${serializeMs.toFixed(1)}ms`,
    );

    expect(gzipped.length).toBeLessThanOrEqual(BUDGET_BYTES_GZIPPED);
    expect(serializeMs).toBeLessThanOrEqual(SERIALIZE_LATENCY_BUDGET_MS);
  });
});
