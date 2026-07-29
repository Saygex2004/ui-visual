// Part B — `attachments` (DATA_MODEL.md §14). Metadata doc; blob lives in
// Firebase Storage under a server-generated path.
import { z } from 'zod';
import { instant } from '../common.js';

export const AttachmentSchema = z.object({
  listing_id: z.string(),
  // Uploads happen AHEAD of send (API_CONTRACT.md §6) — at upload time no
  // message exists yet, so this is null until the sending transaction fills
  // it in. Also what the startup orphan sweep filters on.
  message_id: z.string().nullable(),
  uploader_id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  storage_path: z.string(),
  uploaded_at: instant,
});

export type Attachment = z.infer<typeof AttachmentSchema>;
