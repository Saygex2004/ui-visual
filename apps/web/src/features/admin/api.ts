// Admin accounts + categories + activity API calls (API_CONTRACT.md §8).
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
