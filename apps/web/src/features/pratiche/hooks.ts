// Pratiche data hooks. One query holds the whole register; every mutation
// invalidates it rather than patching the cache by hand — the list is small
// (a hand-kept archive, not a scraped dataset) and a refetch is cheaper than
// a second copy of the merge rules that could drift from the server's.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePraticaRequest, UpdatePraticaRequest } from '@pvp/shared';
import * as praticheApi from './api.js';

export const praticheQueryKey = ['pratiche'] as const;

export function usePratiche() {
  return useQuery({ queryKey: praticheQueryKey, queryFn: praticheApi.fetchPratiche });
}

export function useCreatePratica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePraticaRequest) => praticheApi.createPratica(body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: praticheQueryKey }),
  });
}

export function useUpdatePratica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePraticaRequest }) =>
      praticheApi.updatePratica(id, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: praticheQueryKey }),
  });
}

export function useDeletePratica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => praticheApi.deletePratica(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: praticheQueryKey }),
  });
}
