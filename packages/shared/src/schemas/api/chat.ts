// API — chat bodies (API_CONTRACT.md §5) and attachments (§6).
import { z } from 'zod';
import { RichTextNodeSchema } from '../partB/chat.js';

export const AttachmentDescriptorSchema = z.object({
  id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
});

export const ChatMessageViewSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  sent_at: z.string(),
  body: RichTextNodeSchema.nullable(),
  attachments: z.array(AttachmentDescriptorSchema),
});

export const ThreadViewSchema = z.object({
  listing_id: z.string(),
  participant_ids: z.array(z.string()),
  closed: z.boolean(),
  message_count: z.number().int(),
});

export const ThreadListItemSchema = z.object({
  listing_id: z.string(),
  title: z.string(),
  unread: z.number().int(),
  closed: z.boolean(),
  last_message_at: z.string().nullable(),
  preview: z.object({ author_id: z.string(), excerpt: z.string() }).nullable(),
  participant_ids: z.array(z.string()),
  listing_available: z.boolean(), // false → de-emphasized, not openable
});

export const ThreadsListResponseSchema = z.object({ threads: z.array(ThreadListItemSchema) });
export const UnreadResponseSchema = z.object({ total: z.number().int() });

export const ThreadResponseSchema = z.object({
  thread: ThreadViewSchema,
  messages: z.array(ChatMessageViewSchema),
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
export type ChatMessageView = z.infer<typeof ChatMessageViewSchema>;
export type ThreadView = z.infer<typeof ThreadViewSchema>;
export type ThreadListItem = z.infer<typeof ThreadListItemSchema>;
export type ThreadsListResponse = z.infer<typeof ThreadsListResponseSchema>;
export type ThreadResponse = z.infer<typeof ThreadResponseSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type AddParticipantRequest = z.infer<typeof AddParticipantRequestSchema>;
export type SignedUrlResponse = z.infer<typeof SignedUrlResponseSchema>;
