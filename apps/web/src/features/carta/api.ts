import { api } from '../../lib/apiClient.js';
import type {
  CartaTemplatesResponse,
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
