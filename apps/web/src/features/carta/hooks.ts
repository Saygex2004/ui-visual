import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCartaAziendaRequest,
  SetCartaFirmatariRequest,
  SetCartaTemplateRequest,
  TipoTemplate,
} from '@pvp/shared';
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

export const cartaAziendeQueryKey = ['carta', 'aziende'] as const;

export function useCartaAziende() {
  return useQuery({ queryKey: cartaAziendeQueryKey, queryFn: cartaApi.fetchAziende });
}

function invalidaAziende(qc: ReturnType<typeof useQueryClient>) {
  return () => void qc.invalidateQueries({ queryKey: cartaAziendeQueryKey });
}

export function useCreaAzienda() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cartaApi.creaAzienda, onSuccess: invalidaAziende(qc) });
}

export function useAggiornaAzienda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateCartaAziendaRequest> }) =>
      cartaApi.aggiornaAzienda(id, body),
    onSuccess: invalidaAziende(qc),
  });
}

export function useEliminaAzienda() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cartaApi.eliminaAzienda, onSuccess: invalidaAziende(qc) });
}
