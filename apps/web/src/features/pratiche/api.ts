// Pratiche API calls (admin-only routes).
import { api } from '../../lib/apiClient.js';
import type {
  PraticheListResponse,
  CreatePraticaRequest,
  CreatePraticaResponse,
  UpdatePraticaRequest,
  UpdatePraticaResponse,
} from '@pvp/shared';

export function fetchPratiche(): Promise<PraticheListResponse> {
  return api.get<PraticheListResponse>('/pratiche');
}

export function createPratica(body: CreatePraticaRequest): Promise<CreatePraticaResponse> {
  return api.post<CreatePraticaResponse>('/pratiche', body);
}

export function updatePratica(
  id: string,
  body: UpdatePraticaRequest,
): Promise<UpdatePraticaResponse> {
  return api.patch<UpdatePraticaResponse>(`/pratiche/${id}`, body);
}

export function deletePratica(id: string): Promise<void> {
  return api.delete<void>(`/pratiche/${id}`);
}
