// Join point for `snapshot rows ⋈ ratings map` (FRONTEND.md §3). Ratings
// arrive on their own, faster-polling endpoint in Phase 6 — this phase has no
// ratings data at all, so the map is always empty and every row's rating is
// `null`. Isolated here so Phase 6 only needs to replace `useRatingsMap`'s
// body (a real query) — nothing else in the dashboard should need to change.
import type { ListingRow } from '@pvp/shared';

/** listing id -> rating value; empty until Phase 6. */
export type RatingsMap = ReadonlyMap<string, string | null>;

const EMPTY_RATINGS: RatingsMap = new Map();

export function useRatingsMap(): RatingsMap {
  return EMPTY_RATINGS;
}

export function joinRating<T extends ListingRow>(
  row: T,
  ratings: RatingsMap,
): T & { rating: string | null } {
  return { ...row, rating: ratings.get(row.id) ?? null };
}
