// Chat + attachments API calls (API_CONTRACT.md §5/§6).
import { api } from '../../lib/apiClient.js';
import type {
  ThreadsListResponse,
  UnreadResponse,
  ThreadResponse,
  SendMessageResponse,
  ThreadOnlyResponse,
  ParticipantCandidatesResponse,
  RichTextNode,
  SignedUrlResponse,
} from '@pvp/shared';

export function fetchMyChats(): Promise<ThreadsListResponse> {
  return api.get<ThreadsListResponse>('/chats');
}

export function fetchUnreadTotal(): Promise<UnreadResponse> {
  return api.get<UnreadResponse>('/chats/unread');
}

export function fetchThread(listingId: string, after?: string): Promise<ThreadResponse> {
  const query = after ? `?after=${encodeURIComponent(after)}` : '';
  return api.get<ThreadResponse>(`/chats/${listingId}${query}`);
}

export function sendMessage(
  listingId: string,
  body: { body: RichTextNode | null; attachment_ids: string[] },
): Promise<SendMessageResponse> {
  return api.post<SendMessageResponse>(`/chats/${listingId}/messages`, body);
}

export function addParticipant(listingId: string, userId: string): Promise<ThreadOnlyResponse> {
  return api.post<ThreadOnlyResponse>(`/chats/${listingId}/participants`, { user_id: userId });
}

export function fetchParticipantCandidates(
  listingId: string,
): Promise<ParticipantCandidatesResponse> {
  return api.get<ParticipantCandidatesResponse>(`/chats/${listingId}/participant-candidates`);
}

export function closeThread(listingId: string): Promise<ThreadOnlyResponse> {
  return api.post<ThreadOnlyResponse>(`/chats/${listingId}/close`);
}

export function reopenThread(listingId: string): Promise<ThreadOnlyResponse> {
  return api.post<ThreadOnlyResponse>(`/chats/${listingId}/reopen`);
}

export interface UploadedAttachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export function uploadAttachment(
  listingId: string,
  file: File,
): Promise<{ attachment: UploadedAttachment }> {
  const form = new FormData();
  form.append('file', file);
  return api.upload<{ attachment: UploadedAttachment }>(
    `/attachments?listing_id=${encodeURIComponent(listingId)}`,
    form,
  );
}

export function fetchAttachmentUrl(attachmentId: string): Promise<SignedUrlResponse> {
  return api.get<SignedUrlResponse>(`/attachments/${attachmentId}/url`);
}
