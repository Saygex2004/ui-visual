// Synthetic listing generator — deterministic given `seed`, shaped like real
// fixtures. Originally inline in apps/server's payload-budget test (Phase 2);
// extracted here (Phase 4) so both that test and a seed script can build the
// same 10k-listing set for a real-browser performance check (UI §11) without
// duplicating the generator. Exported via the package's `./testing` subpath
// (see package.json `exports`) — deliberately NOT part of the main `.`
// export, so it never ships in anything `apps/web` could import at runtime.
import { seededRandom } from '../domain/rng.js';
import { RECOGNIZED_REGIONS } from '../constants/clusters.js';
import { EXCLUSION_CODES } from '../constants/exclusions.js';
import type { Listing } from '../schemas/partA/listing.js';
import type { Scope } from '../constants/areas.js';

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

/** Synthetic listings shaped like real fixtures, scaled to `count` for a
 *  realistic payload-size / real-browser performance measurement.
 *  Deterministic given `seed`. Real-estate (`immobili`) only — the
 *  thousands-of-rows requirement (UI §11) is a real-estate concern; credits
 *  clusters never approach this scale. */
export function buildSyntheticListings(count: number, seed: string): Listing[] {
  const rand = seededRandom(seed);
  const regionPool: Array<string | null> = [...RECOGNIZED_REGIONS, null, 'RegioneNonMappata'];
  const scope: Scope = 'immobili';

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
      scope,
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
