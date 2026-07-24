// Area snapshot API call (API_CONTRACT.md §3).
import { api } from '../../lib/apiClient.js';
import type { AreaSnapshot, AreaSlug } from '@pvp/shared';

export function fetchAreaSnapshot(area: AreaSlug): Promise<AreaSnapshot> {
  return api.get<AreaSnapshot>(`/areas/${area}/snapshot`);
}
