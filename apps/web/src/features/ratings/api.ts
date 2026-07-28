// Ratings API calls (API_CONTRACT.md §4).
import { api } from '../../lib/apiClient.js';
import type { RatingsDeltaResponse, SetRatingResponse, RatingValue } from '@pvp/shared';

export function fetchRatingsDelta(since: string | null): Promise<RatingsDeltaResponse> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return api.get<RatingsDeltaResponse>(`/ratings${query}`);
}

export function setRating(listingId: string, value: RatingValue): Promise<SetRatingResponse> {
  return api.put<SetRatingResponse>(`/ratings/${listingId}`, { value });
}

export function clearRating(listingId: string): Promise<void> {
  return api.delete<void>(`/ratings/${listingId}`);
}
