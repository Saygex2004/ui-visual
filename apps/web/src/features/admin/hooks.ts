import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateUserRequest,
  Role,
  Vista,
  RandomAssignRequest,
  ByIdAssignRequest,
} from '@pvp/shared';
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

export function useRandomAssign() {
  return useMutation({
    mutationFn: (body: RandomAssignRequest) => adminApi.randomAssign(body),
  });
}

export function useAssignedForRemoval(userId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'calendar', 'assigned', userId, date],
    queryFn: () => adminApi.fetchAssignedForRemoval(userId, date),
    enabled,
  });
}

export function useRemoveAssignments() {
  return useMutation({
    mutationFn: ({
      userId,
      date,
      listingIds,
    }: {
      userId: string;
      date: string;
      listingIds: readonly string[];
    }) => adminApi.removeAssignments(userId, date, listingIds),
  });
}

export function useListingSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'listings', 'search', q],
    queryFn: () => adminApi.searchListings(q),
    enabled,
  });
}

export function useByIdAssign() {
  return useMutation({
    mutationFn: (body: ByIdAssignRequest) => adminApi.byIdAssign(body),
  });
}

export function useSetViste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, viste }: { userId: string; viste: Vista[] }) =>
      adminApi.setViste(userId, viste),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
  });
}
