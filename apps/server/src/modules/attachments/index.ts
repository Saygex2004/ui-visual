// Attachments module (API_CONTRACT.md §6). Uploads are mediated entirely by
// the server — the browser never touches Storage directly (SPECIFICATIONS.md
// §11); downloads are short-lived signed URLs minted after checking the
// caller participates in the attachment's thread.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { SignedUrlResponseSchema, AttachmentDescriptorSchema } from '@pvp/shared';
import { attachmentsRepo, chatRepo } from '../../repositories/index.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import type { Bucket } from '../../storage.js';

const UploadResponseSchema = z.object({ attachment: AttachmentDescriptorSchema });

export interface AttachmentsModuleDeps {
  db: Firestore;
  bucket: Bucket;
  maxBytes: number;
  allowedTypes: readonly string[];
  signedUrlTtlMinutes: number;
}

export async function registerAttachmentsModule(
  app: FastifyInstance,
  deps: AttachmentsModuleDeps,
): Promise<void> {
  const { db, bucket, maxBytes, allowedTypes, signedUrlTtlMinutes } = deps;

  await app.register(multipart, { limits: { files: 1, fileSize: maxBytes } });

  app.post<{ Querystring: { listing_id?: string } }>('/attachments', async (req, reply) => {
    const listingId = req.query.listing_id;
    if (!listingId) throw new ApiError(400, 'errors.common.validation');

    const file = await req.file();
    if (!file) throw new ApiError(400, 'errors.common.validation');

    // Checked before size, matching the phase constraint "refused ... before
    // any blob is written" for both keys, in the order a user would want to
    // know about them (wrong kind of file vs. too big).
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ApiError(415, 'errors.attachments.type', { allowed: allowedTypes });
    }

    // `limits.fileSize` above makes `@fastify/multipart` throw its own
    // `RequestFileTooLargeError` (statusCode 413, `throwFileSizeLimit`
    // defaults to true — verified against the real plugin source, not
    // assumed) once the stream is truncated — caught here and translated to
    // this module's own error key; the generic envelope's `keyForStatus`
    // has no 413 case (413 isn't inherently attachment-specific), and
    // `file.file.truncated` alone is checked too as a defensive fallback in
    // case a future config ever sets `throwFileSizeLimit: false`.
    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (err) {
      if (err instanceof app.multipartErrors.RequestFileTooLargeError) {
        throw new ApiError(413, 'errors.attachments.tooLarge', { maxBytes });
      }
      throw err;
    }
    if (file.file.truncated) {
      throw new ApiError(413, 'errors.attachments.tooLarge', { maxBytes });
    }

    const attachment = await attachmentsRepo.create(db, {
      listing_id: listingId,
      uploader_id: req.user!.id,
      filename: file.filename,
      content_type: file.mimetype,
      size_bytes: buffer.length,
    });

    await bucket
      .file(attachment.storage_path)
      .save(buffer, { contentType: attachment.content_type });

    reply.code(201);
    return UploadResponseSchema.parse({
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        content_type: attachment.content_type,
        size_bytes: attachment.size_bytes,
      },
    });
  });

  app.get<{ Params: { id: string } }>('/attachments/:id/url', async (req) => {
    const attachment = await attachmentsRepo.getById(db, req.params.id);
    if (!attachment) throw new ApiError(404, 'errors.common.notFound');

    const thread = await chatRepo.getThread(db, attachment.listing_id);
    if (thread === null || !thread.participant_ids.includes(req.user!.id)) {
      throw new ApiError(403, 'errors.auth.forbidden');
    }

    const expiresAt = new Date(Date.now() + signedUrlTtlMinutes * 60_000);
    const [url] = await bucket.file(attachment.storage_path).getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });

    return SignedUrlResponseSchema.parse({ url, expires_at: expiresAt.toISOString() });
  });
}

const DEFAULT_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/** Startup sweep (API_CONTRACT.md §6): uploads never claimed by a sent
 *  message, older than a day — deletes both the blob and the metadata doc.
 *  Called once from `app.ts` at boot, not on a route. */
export async function sweepOrphanAttachments(
  db: Firestore,
  bucket: Bucket,
  olderThanMs: number = DEFAULT_ORPHAN_AGE_MS,
): Promise<number> {
  const orphans = await attachmentsRepo.listOrphans(db, olderThanMs);
  for (const orphan of orphans) {
    await bucket.file(orphan.storage_path).delete({ ignoreNotFound: true });
    await attachmentsRepo.deleteDoc(db, orphan.id);
  }
  return orphans.length;
}
