// Admin accounts + categories + activity + calendar assignment API calls
// (API_CONTRACT.md §7/§8).
import { api } from '../../lib/apiClient.js';
import type {
  UsersResponse,
  CreateUserRequest,
  CreateUserResponse,
  AdminUser,
  CategoriesResponse,
  SetCategoriesResponse,
  EventsResponse,
  RunsResponse,
  RandomAssignRequest,
  RandomAssignResponse,
  RemoveAssignResponse,
  ByIdAssignRequest,
  ByIdAssignResponse,
  ListingSearchResponse,
  CalendarRow,
  SetVisteRequest,
  SetVisteResponse,
} from '@pvp/shared';

export function fetchUsers(): Promise<UsersResponse> {
  return api.get<UsersResponse>('/admin/users');
}

export function createUser(body: CreateUserRequest): Promise<CreateUserResponse> {
  return api.post<CreateUserResponse>('/admin/users', body);
}

export function setPassword(userId: string, newPassword: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/password`, { new_password: newPassword });
}

export function setRole(userId: string, role: 'user' | 'admin'): Promise<{ user: AdminUser }> {
  return api.post<{ user: AdminUser }>(`/admin/users/${userId}/role`, { role });
}

export function setDisabled(userId: string, disabled: boolean): Promise<{ user: AdminUser }> {
  return api.post<{ user: AdminUser }>(`/admin/users/${userId}/${disabled ? 'disable' : 'enable'}`);
}

export function fetchCategories(): Promise<CategoriesResponse> {
  return api.get<CategoriesResponse>('/admin/categories');
}

export function saveCategories(codes: readonly string[]): Promise<SetCategoriesResponse> {
  return api.put<SetCategoriesResponse>('/admin/categories', { codes });
}

export function fetchEvents(): Promise<EventsResponse> {
  return api.get<EventsResponse>('/admin/events');
}

export function fetchRuns(): Promise<RunsResponse> {
  return api.get<RunsResponse>('/admin/runs');
}

export function randomAssign(body: RandomAssignRequest): Promise<RandomAssignResponse> {
  return api.post<RandomAssignResponse>('/admin/calendar/random', body);
}

export function fetchAssignedForRemoval(
  userId: string,
  date: string,
): Promise<{ listings: CalendarRow[] }> {
  return api.get<{ listings: CalendarRow[] }>(`/admin/calendar/${userId}/${date}`);
}

export function removeAssignments(
  userId: string,
  date: string,
  listingIds: readonly string[],
): Promise<RemoveAssignResponse> {
  return api.delete<RemoveAssignResponse>(`/admin/calendar/${userId}/${date}`, {
    listing_ids: listingIds,
  });
}

export function searchListings(q: string): Promise<ListingSearchResponse> {
  return api.get<ListingSearchResponse>(`/admin/listings/search?q=${encodeURIComponent(q)}`);
}

export function byIdAssign(body: ByIdAssignRequest): Promise<ByIdAssignResponse> {
  return api.post<ByIdAssignResponse>('/admin/calendar/by-id', body);
}

export function setViste(
  userId: string,
  viste: SetVisteRequest['viste'],
): Promise<SetVisteResponse> {
  return api.post<SetVisteResponse>(`/admin/users/${userId}/viste`, { viste });
}
