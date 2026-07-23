// Calendar eligibility and diversified draw (DOMAIN_RULES.md §8).
import { classifyListing, type ClassifyInput } from './classify.js';
import { priceBand } from './priceBand.js';
import { REAL_ESTATE_CLUSTERS, type RealEstateClusterKey } from '../constants/clusters.js';
import { PRICE_BANDS, type PriceBand } from '../constants/bands.js';
import { seededRandom, seededShuffle } from './rng.js';

/** Default automatic daily target (UI §7.3; also CONFIGURATION default). */
export const DEFAULT_CALENDAR_TARGET = 18;

export interface EligibilityInput {
  scope: ClassifyInput['scope'];
  cod_tipo_rito?: string | null;
  archived_at?: unknown; // null ⇒ active
}

/**
 * Automatic-assignment eligibility (§8): scope immobili, active, not excluded,
 * and never previously assigned to anyone (no `assignment_index` entry — which
 * also covers "never completed"). Corporate listings are never eligible
 * automatically; the admin by-id path is their only calendar entry.
 */
export function isEligibleForCalendar(
  listing: EligibilityInput,
  opts: { hasAssignmentEntry: boolean },
): boolean {
  if (listing.scope !== 'immobili') return false;
  if (listing.archived_at != null) return false;
  if (opts.hasAssignmentEntry) return false;
  const { excluded } = classifyListing({ scope: 'immobili', cod_tipo_rito: listing.cod_tipo_rito });
  return !excluded;
}

export interface DiversifiableListing extends ClassifyInput {
  id: string | number;
}

// Deterministic cell order: cluster order (as declared) then band order.
const CLUSTER_ORDER: readonly RealEstateClusterKey[] = REAL_ESTATE_CLUSTERS.map((c) => c.key);

function cellRank(clusterKey: string, band: PriceBand): number {
  const c = CLUSTER_ORDER.indexOf(clusterKey as RealEstateClusterKey);
  const b = PRICE_BANDS.indexOf(band);
  return (c < 0 ? CLUSTER_ORDER.length : c) * PRICE_BANDS.length + b;
}

/**
 * Diversified draw (§8): partition the eligible pool by (cluster, price band),
 * shuffle within each cell (seeded), then draw round-robin across non-empty
 * cells (ordered by cluster then band) until `target` is reached or the pool is
 * exhausted. A pool smaller than the target yields the whole pool — a short day
 * is correct, never padded. Deterministic given the pool and `seed`.
 * Returns the drawn listing ids in draw order.
 */
export function diversifiedDraw(
  pool: readonly DiversifiableListing[],
  target: number,
  seed: string | number,
): string[] {
  if (target <= 0 || pool.length === 0) return [];

  // Partition into cells keyed by rank.
  const cells = new Map<number, string[]>();
  for (const listing of pool) {
    const { clusterKey } = classifyListing(listing);
    const band = priceBand(listing.valore_richiesto);
    const rank = cellRank(clusterKey, band);
    const bucket = cells.get(rank) ?? [];
    bucket.push(String(listing.id));
    cells.set(rank, bucket);
  }

  // Shuffle within each cell with a per-cell derived seed (stable).
  const orderedRanks = [...cells.keys()].sort((a, b) => a - b);
  for (const rank of orderedRanks) {
    seededShuffle(cells.get(rank)!, seededRandom(`${seed}:${rank}`));
  }

  // Round-robin across non-empty cells until target or exhaustion.
  const drawn: string[] = [];
  const cursors = new Map<number, number>();
  let progressed = true;
  while (drawn.length < target && progressed) {
    progressed = false;
    for (const rank of orderedRanks) {
      if (drawn.length >= target) break;
      const cell = cells.get(rank)!;
      const cursor = cursors.get(rank) ?? 0;
      if (cursor < cell.length) {
        drawn.push(cell[cursor]!);
        cursors.set(rank, cursor + 1);
        progressed = true;
      }
    }
  }

  return drawn;
}
