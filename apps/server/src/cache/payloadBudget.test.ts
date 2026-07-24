// Payload-budget test (TESTING.md §4, API_CONTRACT.md §3): a 10k-listing
// synthetic snapshot must serialize under the gzipped-size budget and within a
// latency bound. Pure offline unit test — `assembleSnapshot` takes in-memory
// inputs only, so this needs no emulator: we generate the synthetic set
// directly (from fixture-shaped templates) rather than seeding 10k Firestore
// documents just to measure a payload size.
import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  seededRandom,
  RECOGNIZED_REGIONS,
  EXCLUSION_CODES,
  type Listing,
  type Scope,
} from '@pvp/shared';
import { assembleSnapshot, type ScopeMetaInput } from './build.js';

const LISTING_COUNT = 10_000;
// API_CONTRACT.md §3: "Target: a 10k-listing snapshot ≤ ~3 MB gzipped".
const BUDGET_BYTES_GZIPPED = 3 * 1024 * 1024;
// No exact figure is fixed in the spec for serialization latency; this is a
// generous ceiling — actual numbers are recorded in the Phase 2 handoff.
const SERIALIZE_LATENCY_BUDGET_MS = 500;

const TRIBUNALI = [
  'Tribunale di Roma',
  'Tribunale di Milano',
  'Tribunale di Napoli',
  'Tribunale di Torino',
  'Tribunale di Bari',
  'Tribunale di Firenze',
];

const PRINCIPALI_RITO = ['LG', 'COPR', 'CP', 'NUCP', null] as const;
const FALLIMENTI_RITO = ['FALL', 'NFAL'] as const;
const EXCLUSION_RITO = EXCLUSION_CODES.map((e) => e.code);

const REALISTIC_DESCRIZIONE =
  'Lotto immobiliare sito in zona residenziale, composto da unità abitativa su ' +
  'due livelli con annesso posto auto coperto e cantina di pertinenza, in ' +
  'discreto stato di manutenzione generale. Sono presenti impianti elettrico e ' +
  'idraulico da verificare in sede di sopralluogo tecnico.';

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

/** Synthetic listings shaped like real fixtures, scaled to 10k for a
 *  realistic payload-size measurement. Deterministic given `seed`. */
function buildSyntheticListings(count: number, seed: string): Listing[] {
  const rand = seededRandom(seed);
  const regionPool: Array<string | null> = [...RECOGNIZED_REGIONS, null, 'RegioneNonMappata'];

  const listings: Listing[] = [];
  for (let i = 0; i < count; i++) {
    const region = pick(rand, regionPool);
    const bucketRoll = rand();
    const codTipoRito =
      bucketRoll < 0.12
        ? pick(rand, EXCLUSION_RITO)
        : bucketRoll < 0.3
          ? pick(rand, FALLIMENTI_RITO)
          : pick(rand, PRINCIPALI_RITO);

    // ~15% of listings belong to a blocco group of ~3 (shared procedure key).
    const inBlocco = rand() < 0.15;
    const groupIndex = Math.floor(i / 3);
    const tribunale = pick(rand, TRIBUNALI);

    const valore = rand() < 0.4 ? null : Math.round(rand() * 900_000 * 100) / 100;
    const archived = i % 25 === 0; // ~4% archived, exercises the archive array

    listings.push({
      id: 900_000 + i,
      scope: 'immobili',
      tipo_bene: 'Appartamento',
      cod_tipo_categ_lotto: null,
      tipo_procedura: inBlocco ? 'Liquidazione Giudiziale' : `Procedura ${i}`,
      cod_tipo_rito: codTipoRito,
      cod_tipo_registro: null,
      numero: inBlocco ? String(groupIndex) : String(i),
      anno: '2026',
      tribunale,
      valore_richiesto: valore,
      data_pubblicazione: '2026-01-15',
      data_vendita: '2026-09-30',
      regione: region,
      provincia: region ? `Provincia di ${region}` : null,
      comune: region ? `Comune di ${region}` : null,
      link: `https://pvp.giustizia.it/lotto/${900_000 + i}`,
      disponibilita: 'Non specificato',
      descrizione: REALISTIC_DESCRIZIONE,
      archived_at: archived ? '2026-05-01T00:00:00.000Z' : null,
      first_seen_at: '2026-01-01T00:00:00.000Z',
      last_seen_at: '2026-01-01T00:00:00.000Z',
      content_hash: `synthetic-hash-${i}`,
    });
  }
  return listings;
}

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
