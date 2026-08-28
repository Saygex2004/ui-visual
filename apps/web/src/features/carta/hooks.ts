import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SetCartaTemplateRequest, TipoTemplate } from '@pvp/shared';
import * as cartaApi from './api.js';

export const cartaTemplatesQueryKey = ['carta', 'templates'] as const;

export function useCartaTemplates() {
  return useQuery({ queryKey: cartaTemplatesQueryKey, queryFn: cartaApi.fetchTemplates });
}

export function useSetCartaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tipo, body }: { tipo: TipoTemplate; body: SetCartaTemplateRequest }) =>
      cartaApi.setTemplate(tipo, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: cartaTemplatesQueryKey }),
  });
}

export function useResetCartaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tipo: TipoTemplate) => cartaApi.resetTemplate(tipo),
    onSuccess: () => void qc.invalidateQueries({ queryKey: cartaTemplatesQueryKey }),
  });
}
