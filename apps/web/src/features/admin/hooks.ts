import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserRequest, Role } from '@pvp/shared';
import * as adminApi from './api.js';

export const adminUsersQueryKey = ['admin', 'users'] as const;

export function useAdminUsers() {
  return useQuery({ queryKey: adminUsersQueryKey, queryFn: adminApi.fetchUsers });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => adminApi.createUser(body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
  });
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      adminApi.setPassword(userId, newPassword),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
  });
}

export function useSetRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      adminApi.setRole(userId, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
  });
}

export function useSetDisabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, disabled }: { userId: string; disabled: boolean }) =>
      adminApi.setDisabled(userId, disabled),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
  });
}

export const adminCategoriesQueryKey = ['admin', 'categories'] as const;

export function useAdminCategories() {
  return useQuery({ queryKey: adminCategoriesQueryKey, queryFn: adminApi.fetchCategories });
}

export function useSaveCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (codes: readonly string[]) => adminApi.saveCategories(codes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminCategoriesQueryKey }),
  });
}

export const adminEventsQueryKey = ['admin', 'events'] as const;

export function useAdminEvents() {
  return useQuery({ queryKey: adminEventsQueryKey, queryFn: adminApi.fetchEvents });
}

export const adminRunsQueryKey = ['admin', 'runs'] as const;

export function useAdminRuns() {
  return useQuery({ queryKey: adminRunsQueryKey, queryFn: adminApi.fetchRuns });
}
