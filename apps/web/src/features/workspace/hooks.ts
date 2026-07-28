// Workspace data layer. The listing detail is fetched once on open, not
// polled — "the workspace fetches detail on open" (Phase 6 constraints); live
// reconciliation for the parts that DO change on a faster clock (the rating)
// comes from features/ratings' own poll, not from re-fetching this. The
// activity list is fetched only once the storico tab is actually visited
// (`enabled`), so opening the workspace on dettagli never pays for it.
import { useQuery } from '@tanstack/react-query';
import * as workspaceApi from './api.js';

export const listingDetailQueryKey = (id: string) => ['workspace', 'detail', id] as const;

export function useListingDetail(id: string) {
  return useQuery({
    queryKey: listingDetailQueryKey(id),
    queryFn: () => workspaceApi.fetchListingDetail(id),
  });
}

export const listingActivityQueryKey = (id: string) => ['workspace', 'activity', id] as const;

export function useListingActivity(id: string, enabled: boolean) {
  return useQuery({
    queryKey: listingActivityQueryKey(id),
    queryFn: () => workspaceApi.fetchListingActivity(id),
    enabled,
  });
}
