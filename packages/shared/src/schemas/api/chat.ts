// API — chat bodies (API_CONTRACT.md §5) and attachments (§6).
import { z } from 'zod';
import { RichTextNodeSchema } from '../partB/chat.js';

export const AttachmentDescriptorSchema = z.object({
  id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
});

/** A resolved id→username pair — the only generally-accessible (non-admin)
 *  way to turn an opaque user id into a display name, same reasoning as
 *  `ActivityEventView.actor_username` in Phase 6 (`GET /admin/users` is
 *  admin-only, so a regular participant has no other way to resolve a
 *  colleague's name). Used for both a thread's participant list and the
 *  add-colleague candidate list. */
export const UserRefSchema = z.object({ id: z.string(), username: z.string() });

export const ChatMessageViewSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  author_username: z.string().nullable(),
  sent_at: z.string(),
  body: RichTextNodeSchema.nullable(),
  attachments: z.array(AttachmentDescriptorSchema),
});

/** Raw listing facts, not a composed title/meta-line string — presentation
 *  fallbacks (N/D, separators) are the frontend's job (DATA_MODEL.md §2),
 *  same as every other listing-derived field in the API. All null exactly
 *  when `listing_available` is false (UI §6.2/§6.3's "removed" placeholder —
 *  a thread's listing_id can outlive the listing document it names). Shared
 *  by `ThreadViewSchema` (the thread header, standalone route or workspace
 *  tab) and `ThreadListItemSchema` (*Le mie chat*'s meta line) so neither
 *  needs a second fetch or a cross-feature import of the other's data layer
 *  (FRONTEND.md §1: "cross-feature reuse goes through ratings/ and lib/"). */
export const ListingSummarySchema = z.object({
  listing_available: z.boolean(),
  tipo_bene: z.string().nullable(),
  tribunale: z.string().nullable(),
  comune: z.string().nullable(),
  provincia: z.string().nullable(),
  valore_richiesto: z.number().nullable(),
  link: z.string().nullable(),
});

export const ThreadViewSchema = z.object({
  listing_id: z.string(),
  participants: z.array(UserRefSchema),
  closed: z.boolean(),
  message_count: z.number().int(),
  listing: ListingSummarySchema,
});

export const ThreadListItemSchema = z.object({
  listing_id: z.string(),
  unread: z.number().int(),
  closed: z.boolean(),
  last_message_at: z.string().nullable(),
  preview: z.object({ author_id: z.string(), excerpt: z.string() }).nullable(),
  participants: z.array(UserRefSchema),
  listing: ListingSummarySchema,
});

export const ThreadsListResponseSchema = z.object({ threads: z.array(ThreadListItemSchema) });
export const UnreadResponseSchema = z.object({ total: z.number().int() });

export const ThreadResponseSchema = z.object({
  thread: ThreadViewSchema,
  messages: z.array(ChatMessageViewSchema),
});

/** The bare-`{thread}` shape API_CONTRACT.md §5 documents for the
 *  participants/close/reopen mutations — no message list. */
export const ThreadOnlyResponseSchema = z.object({ thread: ThreadViewSchema });

/** `GET /chats/:listingId/participant-candidates` (phase plan's Scoperta
 *  chiave 4) — any authenticated user, not just admins, since UI §6.2 lets
 *  any participant add a colleague; `GET /admin/users` can't serve this. */
export const ParticipantCandidatesResponseSchema = z.object({
  users: z.array(UserRefSchema),
});

export const SendMessageRequestSchema = z
  .object({
    body: RichTextNodeSchema.nullish(),
    attachment_ids: z.array(z.string()).optional(),
  })
  .refine((m) => m.body != null || (m.attachment_ids?.length ?? 0) > 0, {
    message: 'a message must carry text, attachments, or both',
  });

export const SendMessageResponseSchema = z.object({ message: ChatMessageViewSchema });
export const AddParticipantRequestSchema = z.object({ user_id: z.string() });

export const SignedUrlResponseSchema = z.object({
  url: z.string(),
  expires_at: z.string(),
});

export type AttachmentDescriptor = z.infer<typeof AttachmentDescriptorSchema>;
export type UserRef = z.infer<typeof UserRefSchema>;
export type ListingSummary = z.infer<typeof ListingSummarySchema>;
export type ChatMessageView = z.infer<typeof ChatMessageViewSchema>;
export type ThreadView = z.infer<typeof ThreadViewSchema>;
export type ThreadListItem = z.infer<typeof ThreadListItemSchema>;
export type ThreadsListResponse = z.infer<typeof ThreadsListResponseSchema>;
export type UnreadResponse = z.infer<typeof UnreadResponseSchema>;
export type ThreadResponse = z.infer<typeof ThreadResponseSchema>;
export type ThreadOnlyResponse = z.infer<typeof ThreadOnlyResponseSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type AddParticipantRequest = z.infer<typeof AddParticipantRequestSchema>;
export type SignedUrlResponse = z.infer<typeof SignedUrlResponseSchema>;
export type ParticipantCandidatesResponse = z.infer<typeof ParticipantCandidatesResponseSchema>;
