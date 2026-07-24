// Auth API calls (API_CONTRACT.md §2).
import { api } from '../../lib/apiClient.js';
import type { LoginRequest, LoginResponse, MeResponse, PasswordChangeRequest } from '@pvp/shared';

export function login(body: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', body);
}

export function logout(): Promise<void> {
  return api.post<void>('/auth/logout');
}

export function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}

export function changePassword(body: PasswordChangeRequest): Promise<void> {
  return api.post<void>('/auth/password', body);
}
