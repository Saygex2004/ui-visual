// Chat data layer (FRONTEND.md §3, API_CONTRACT.md §10 — unread ~20s, open
// thread ~5–10s). `useMyThreadsMap` and the *Le mie chat* screen share ONE
// `['chats']` query (React Query dedupes same-key concurrent use) — the
// per-row table badge (Scoperta chiave 5 of the phase plan: reuse GET
// /chats rather than a new endpoint) and the list screen are two views over
// the same poll, not two pollers.
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  POLL_CADENCES_MS,
  type ThreadsListResponse,
  type ThreadListItem,
  type ThreadView,
  type ChatMessageView,
  type RichTextNode,
} from '@pvp/shared';
import * as chatApi from './api.js';

const CHATS_QUERY_KEY = ['chats'] as const;
const UNREAD_QUERY_KEY = ['chats', 'unread'] as const;
const CANDIDATES_QUERY_KEY = (listingId: string) => ['chats', listingId, 'candidates'] as const;
const threadQueryKey = (listingId: string) => ['chats', 'thread', listingId] as const;

export function useMyChatsQuery(): UseQueryResult<ThreadsListResponse> {
  return useQuery({
    queryKey: CHATS_QUERY_KEY,
    queryFn: () => chatApi.fetchMyChats(),
    refetchInterval: POLL_CADENCES_MS.unread,
  });
}

export function useMyChats(): readonly ThreadListItem[] {
  const { data } = useMyChatsQuery();
  return data?.threads ?? [];
}

/** listing id → that thread's list item, for the table's per-row chat badge
 *  (UI §6.1). Absent from the map ⇒ no thread for that listing yet ⇒ no badge. */
export function useMyThreadsMap(): ReadonlyMap<string, ThreadListItem> {
  const threads = useMyChats();
  return useMemo(() => new Map(threads.map((t) => [t.listing_id, t])), [threads]);
}

export function useUnreadTotal(): number {
  const { data } = useQuery({
    queryKey: UNREAD_QUERY_KEY,
    queryFn: () => chatApi.fetchUnreadTotal(),
    refetchInterval: POLL_CADENCES_MS.unread,
  });
  return data?.total ?? 0;
}

interface ThreadCache {
  thread: ThreadView;
  messages: ChatMessageView[];
}

/** Opens/polls one thread. The accumulating-cache pattern established for
 *  ratings in Phase 6 (`features/ratings/hooks.ts`): the query's OWN
 *  previous value is the `after` cursor for its next fetch, so messages
 *  accumulate across polls instead of the response replacing them; `thread`
 *  itself is never delta'd, always the latest full state. */
export function useThread(listingId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = threadQueryKey(listingId);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<ThreadCache> => {
      const previous = queryClient.getQueryData<ThreadCache>(queryKey);
      const after = previous?.messages.at(-1)?.id;
      const res = await chatApi.fetchThread(listingId, after);
      const messages = previous ? [...previous.messages, ...res.messages] : res.messages;
      return { thread: res.thread, messages };
    },
    refetchInterval: POLL_CADENCES_MS.openThread,
    enabled,
  });
}

export function useSendMessage(listingId: string) {
  const queryClient = useQueryClient();
  const queryKey = threadQueryKey(listingId);
  return useMutation({
    mutationFn: (input: { body: RichTextNode | null; attachmentIds: string[] }) =>
      chatApi.sendMessage(listingId, { body: input.body, attachment_ids: input.attachmentIds }),
    onSuccess: (res) => {
      queryClient.setQueryData<ThreadCache>(queryKey, (prev) =>
        prev ? { ...prev, messages: [...prev.messages, res.message] } : prev,
      );
    },
  });
}

export function useAddParticipant(listingId: string) {
  const queryClient = useQueryClient();
  const queryKey = threadQueryKey(listingId);
  return useMutation({
    mutationFn: (userId: string) => chatApi.addParticipant(listingId, userId),
    onSuccess: (res) => {
      queryClient.setQueryData<ThreadCache>(queryKey, (prev) =>
        prev ? { ...prev, thread: res.thread } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_KEY(listingId) });
    },
  });
}

export function useParticipantCandidates(listingId: string, enabled: boolean) {
  return useQuery({
    queryKey: CANDIDATES_QUERY_KEY(listingId),
    queryFn: () => chatApi.fetchParticipantCandidates(listingId),
    enabled,
  });
}

function useSetClosed(listingId: string, action: (id: string) => Promise<{ thread: ThreadView }>) {
  const queryClient = useQueryClient();
  const queryKey = threadQueryKey(listingId);
  return useMutation({
    mutationFn: () => action(listingId),
    onSuccess: (res) => {
      queryClient.setQueryData<ThreadCache>(queryKey, (prev) =>
        prev ? { ...prev, thread: res.thread } : prev,
      );
    },
  });
}

export function useCloseThread(listingId: string) {
  return useSetClosed(listingId, chatApi.closeThread);
}

export function useReopenThread(listingId: string) {
  return useSetClosed(listingId, chatApi.reopenThread);
}

export function useUploadAttachment(listingId: string) {
  return useMutation({
    mutationFn: (file: File) => chatApi.uploadAttachment(listingId, file),
  });
}
