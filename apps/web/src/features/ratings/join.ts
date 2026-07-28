// Pure ratings-map accumulation (FRONTEND.md §3: "tables render `snapshot
// rows ⋈ ratings map`"). Separated from hooks.ts so the delta-application
// logic — the part every consumer's correctness actually depends on — is
// testable without React Query machinery.
import type { RatingDeltaEntry, RatingValue } from '@pvp/shared';

export type RatingsMap = ReadonlyMap<string, RatingValue>;

export const EMPTY_RATINGS_MAP: RatingsMap = new Map();

/** Applies one `GET /ratings` delta (or full-state) response onto a map: a
 *  `{value: null}` tombstone removes the entry, any other entry sets it. */
export function applyRatingsDelta(map: RatingsMap, delta: readonly RatingDeltaEntry[]): RatingsMap {
  const next = new Map(map);
  for (const entry of delta) {
    if (entry.value === null) next.delete(entry.listing_id);
    else next.set(entry.listing_id, entry.value);
  }
  return next;
}
