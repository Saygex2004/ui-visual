// Snapshot data layer (FRONTEND.md §3, API_CONTRACT.md §10): polled ~60s +
// on window refocus. No manual ETag/If-None-Match handling here — the server
// sets a real ETag and the browser's own HTTP cache does the conditional
// revalidation on plain GETs; verified via the Network tab during manual
// testing rather than assumed.
import { useQuery } from '@tanstack/react-query';
import { POLL_CADENCES_MS, type AreaSlug } from '@pvp/shared';
import * as dashboardApi from './api.js';

export const areaSnapshotQueryKey = (area: AreaSlug) => ['dashboard', 'snapshot', area] as const;

/** `enabled: false` skips the request entirely — used where the account has
 *  no permission for the area. Without it the landing polled both snapshots
 *  once a minute for everyone, each denied request costing the auth path's
 *  Firestore reads, for a view the person cannot open. */
export function useAreaSnapshot(area: AreaSlug, enabled = true) {
  return useQuery({
    queryKey: areaSnapshotQueryKey(area),
    queryFn: () => dashboardApi.fetchAreaSnapshot(area),
    refetchInterval: POLL_CADENCES_MS.snapshot,
    refetchOnWindowFocus: true,
    enabled,
  });
}
