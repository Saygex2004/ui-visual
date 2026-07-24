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
