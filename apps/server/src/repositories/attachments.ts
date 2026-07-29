// Repository — `attachments` metadata (Part B, DATA_MODEL.md §14). Firestore
// only; the blob itself lives in Storage (`storage.ts` + `modules/attachments`
// own that side — repos stay one-collection-at-a-time). `message_id` is null
// from upload until the sending transaction (`chatRepo.sendMessage`) claims
// it — "uploads ahead of send" (API_CONTRACT.md §6).
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { AttachmentSchema, type Attachment } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'attachments';

export interface StoredAttachment extends Attachment {
  id: string;
}

export interface NewAttachment {
  listing_id: string;
  uploader_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

/** Generates the doc id first so `storage_path` — a server-generated path,
 *  never the original filename (DATA_MODEL.md §14) — can embed it, then
 *  writes the metadata doc. The caller (the attachments module, which alone
 *  holds the Storage `bucket`) writes the actual blob to the returned path
 *  afterward. */
export async function create(db: Firestore, input: NewAttachment): Promise<StoredAttachment> {
  const ref = db.collection(COLLECTION).doc();
  const storagePath = `attachments/${input.listing_id}/${ref.id}`;
  await ref.set({
    ...input,
    message_id: null,
    storage_path: storagePath,
    uploaded_at: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return { id: ref.id, ...AttachmentSchema.parse(firestoreToPlain(doc.data())) };
}

export async function getById(db: Firestore, id: string): Promise<StoredAttachment | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...AttachmentSchema.parse(firestoreToPlain(doc.data())) };
}

/** Uploads never claimed by a message, older than `olderThanMs` — the
 *  startup orphan sweep's target (API_CONTRACT.md §6: "unreferenced uploads
 *  older than a day are pruned"). */
export async function listOrphans(db: Firestore, olderThanMs: number): Promise<StoredAttachment[]> {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - olderThanMs));
  const snap = await db
    .collection(COLLECTION)
    .where('message_id', '==', null)
    .where('uploaded_at', '<', cutoff)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...AttachmentSchema.parse(firestoreToPlain(d.data())),
  }));
}

export async function deleteDoc(db: Firestore, id: string): Promise<void> {
  await db.collection(COLLECTION).doc(id).delete();
}
