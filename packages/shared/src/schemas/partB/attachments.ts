// Part B — `attachments` (DATA_MODEL.md §14). Metadata doc; blob lives in
// Firebase Storage under a server-generated path.
import { z } from 'zod';
import { instant } from '../common.js';

export const AttachmentSchema = z.object({
  listing_id: z.string(),
  message_id: z.string(),
  uploader_id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  storage_path: z.string(),
  uploaded_at: instant,
});

export type Attachment = z.infer<typeof AttachmentSchema>;
