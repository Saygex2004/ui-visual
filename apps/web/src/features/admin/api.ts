// Admin accounts API calls (API_CONTRACT.md §8).
import { api } from '../../lib/apiClient.js';
import type { UsersResponse, CreateUserRequest, CreateUserResponse, AdminUser } from '@pvp/shared';

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
