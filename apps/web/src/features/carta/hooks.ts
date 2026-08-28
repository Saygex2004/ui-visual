import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SetCartaFirmatariRequest, SetCartaTemplateRequest, TipoTemplate } from '@pvp/shared';
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

export const cartaFirmatariQueryKey = ['carta', 'firmatari'] as const;

export function useCartaFirmatari() {
  return useQuery({ queryKey: cartaFirmatariQueryKey, queryFn: cartaApi.fetchFirmatari });
}

export function useSetCartaFirmatari() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SetCartaFirmatariRequest) => cartaApi.setFirmatari(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: cartaFirmatariQueryKey }),
  });
}

export function useResetCartaFirmatari() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartaApi.resetFirmatari(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: cartaFirmatariQueryKey }),
  });
}
