// Ratings data layer (FRONTEND.md §3, API_CONTRACT.md §10 — ~20s poll).
// `useRatingsMap` accumulates the delta INTO the query's own cached value
// (via `queryClient.getQueryData` as the cursor, not a per-hook-instance ref)
// so every consumer mounted at once — the table AND an open workspace —
// shares one true accumulated state: React Query dedupes concurrent fetches
// for the same queryKey to a single call, so a ref-per-instance cursor would
// silently starve whichever instance's queryFn never actually runs.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { POLL_CADENCES_MS, type RatingValue } from '@pvp/shared';
import * as ratingsApi from './api.js';
import { applyRatingsDelta, EMPTY_RATINGS_MAP, type RatingsMap } from './join.js';

export const ratingsQueryKey = ['ratings'] as const;

interface RatingsCache {
  map: RatingsMap;
  since: string | null;
}

export function useRatingsMap(): RatingsMap {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ratingsQueryKey,
    queryFn: async (): Promise<RatingsCache> => {
      const previous = queryClient.getQueryData<RatingsCache>(ratingsQueryKey);
      const delta = await ratingsApi.fetchRatingsDelta(previous?.since ?? null);
      return {
        map: applyRatingsDelta(previous?.map ?? EMPTY_RATINGS_MAP, delta.ratings),
        since: delta.now,
      };
    },
    refetchInterval: POLL_CADENCES_MS.ratings,
  });
  return query.data?.map ?? EMPTY_RATINGS_MAP;
}

/** Optimistic set/clear (FRONTEND.md §3): apply locally, fire the request,
 *  roll back on failure. Deliberately no `invalidateQueries`/forced refetch
 *  on success — the ~20s poll above reconciles with the shared server state
 *  on its own; ratings are collaborative precisely because everyone sees the
 *  same poll-driven truth, not because every client burst-refetches on every
 *  click. */
function useRatingMutation<TVars extends { listingId: string }>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  applyOptimistic: (map: RatingsMap, vars: TVars) => RatingsMap,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: ratingsQueryKey });
      const previous = queryClient.getQueryData<RatingsCache>(ratingsQueryKey);
      queryClient.setQueryData<RatingsCache>(ratingsQueryKey, {
        map: applyOptimistic(previous?.map ?? EMPTY_RATINGS_MAP, vars),
        since: previous?.since ?? null,
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(ratingsQueryKey, context.previous);
    },
  });
}

export function useSetRating() {
  return useRatingMutation(
    (vars: { listingId: string; value: RatingValue }) =>
      ratingsApi.setRating(vars.listingId, vars.value),
    (map, vars) => new Map(map).set(vars.listingId, vars.value),
  );
}

export function useClearRating() {
  return useRatingMutation(
    (vars: { listingId: string }) => ratingsApi.clearRating(vars.listingId),
    (map, vars) => {
      const next = new Map(map);
      next.delete(vars.listingId);
      return next;
    },
  );
}
