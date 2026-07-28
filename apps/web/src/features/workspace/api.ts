// Listing detail + activity API calls (API_CONTRACT.md §3).
import { api } from '../../lib/apiClient.js';
import type { ListingDetail, ActivityListResponse } from '@pvp/shared';

export function fetchListingDetail(id: string): Promise<ListingDetail> {
  return api.get<ListingDetail>(`/listings/${id}`);
}

export function fetchListingActivity(id: string): Promise<ActivityListResponse> {
  return api.get<ActivityListResponse>(`/listings/${id}/activity`);
}
