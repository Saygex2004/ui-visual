// Auth query/mutation hooks. `meQueryKey` is also read directly by the router
// guard (app/router.tsx) via the QueryClient, so the two stay in sync.
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { LoginRequest, PasswordChangeRequest } from '@pvp/shared';
import * as authApi from './api.js';

export const meQueryKey: QueryKey = ['auth', 'me'];

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: authApi.fetchMe,
    retry: false, // a 401 is an expected, normal "signed out" state
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (data) => {
      queryClient.setQueryData(meQueryKey, data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear(); // drop every cached response on sign-out
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PasswordChangeRequest) => authApi.changePassword(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}
