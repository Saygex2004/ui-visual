import { api } from '../../lib/apiClient.js';
import type {
  CartaFirmatariResponse,
  CartaTemplatesResponse,
  SetCartaFirmatariRequest,
  SetCartaFirmatariResponse,
  SetCartaTemplateRequest,
  SetCartaTemplateResponse,
  TipoTemplate,
} from '@pvp/shared';

export function fetchTemplates(): Promise<CartaTemplatesResponse> {
  return api.get<CartaTemplatesResponse>('/carta/templates');
}

export function setTemplate(
  tipo: TipoTemplate,
  body: SetCartaTemplateRequest,
): Promise<SetCartaTemplateResponse> {
  return api.put<SetCartaTemplateResponse>(`/carta/templates/${tipo}`, body);
}

export function resetTemplate(tipo: TipoTemplate): Promise<void> {
  return api.delete<void>(`/carta/templates/${tipo}`);
}

export function fetchFirmatari(): Promise<CartaFirmatariResponse> {
  return api.get<CartaFirmatariResponse>('/carta/firmatari');
}

export function setFirmatari(body: SetCartaFirmatariRequest): Promise<SetCartaFirmatariResponse> {
  return api.put<SetCartaFirmatariResponse>('/carta/firmatari', body);
}

export function resetFirmatari(): Promise<void> {
  return api.delete<void>('/carta/firmatari');
}
