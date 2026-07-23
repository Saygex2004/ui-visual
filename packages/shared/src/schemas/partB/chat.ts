// Part B — chat (DATA_MODEL.md §13) + `user_counters`.
import { z } from 'zod';
import { instant } from '../common.js';

export const ChatThreadSchema = z.object({
  participant_ids: z.array(z.string()),
  closed: z.boolean(),
  closed_by: z.string().nullable(),
  closed_at: instant.nullable(),
  last_message_at: instant.nullable(),
  last_message_preview: z.object({ author_id: z.string(), excerpt: z.string() }).nullable(),
  message_count: z.number().int(),
  created_at: instant,
});

/**
 * Sanitized TipTap (ProseMirror) JSON node — the constrained schema of
 * SPECIFICATIONS.md §11 (bold/italic/lists/links only). Modeled structurally
 * (recursive), not by node-type enum: the sanitizer (Phase 7) enforces the
 * node/mark allowlist; here we just guarantee well-formed TipTap JSON.
 */
export interface RichTextNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
}

export const RichTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(z.object({ type: z.string(), attrs: z.record(z.string(), z.unknown()).optional() }))
      .optional(),
    content: z.array(RichTextNodeSchema).optional(),
  }),
);

export const ChatMessageSchema = z.object({
  author_id: z.string(),
  sent_at: instant,
  // null for attachment-only messages; a message is never text-less AND
  // attachment-less (enforced at write time, API_CONTRACT.md §5).
  body: RichTextNodeSchema.nullable(),
  attachment_ids: z.array(z.string()),
});

export const ReadStateSchema = z.object({
  last_read_at: instant,
});

export const UserCountersSchema = z.object({
  unread_total: z.number().int(),
  updated_at: instant,
});

export type ChatThread = z.infer<typeof ChatThreadSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ReadState = z.infer<typeof ReadStateSchema>;
export type UserCounters = z.infer<typeof UserCountersSchema>;
