// Repository — `chat_threads` (+ `messages`/`reads` subcollections) and
// `user_counters` arithmetic (Part B, DATA_MODEL.md §13). Every operation
// that touches a counter is a single Firestore transaction so the counter
// stays exactly in sync with the read-state it was derived from — no
// "recount later" repair job exists (SPECIFICATIONS.md §11's sibling
// constraint for chat). Firestore transactions require every `tx.get` before
// any `tx.set`/`tx.update`; every transaction below is written in that order,
// and only ever issues ONE write call per document (a second write to the
// same ref within one transaction throws).
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  ChatThreadSchema,
  ChatMessageSchema,
  ReadStateSchema,
  type ChatThread,
  type ChatMessage,
  type RichTextNode,
  AttachmentSchema,
  sanitizeRichText,
  extractPlainText,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';
import { ApiError } from '../plugins/errorEnvelope.js';

const THREADS = 'chat_threads';
const COUNTERS = 'user_counters';
const ATTACHMENTS = 'attachments';

function threadRef(db: Firestore, listingId: string) {
  return db.collection(THREADS).doc(listingId);
}

export async function getThread(db: Firestore, listingId: string): Promise<ChatThread | null> {
  const doc = await threadRef(db, listingId).get();
  if (!doc.exists) return null;
  return ChatThreadSchema.parse(firestoreToPlain(doc.data()));
}

export interface StoredMessage extends ChatMessage {
  id: string;
}

async function listMessages(db: Firestore, listingId: string): Promise<StoredMessage[]> {
  const snap = await threadRef(db, listingId)
    .collection('messages')
    .orderBy('sent_at', 'asc')
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...ChatMessageSchema.parse(firestoreToPlain(d.data())),
  }));
}

async function readLastReadAt(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
): Promise<string | null> {
  const snap = await tx.get(ref);
  return snap.exists ? ReadStateSchema.parse(firestoreToPlain(snap.data())).last_read_at : null;
}

function unreadFrom<T extends Pick<ChatMessage, 'author_id' | 'sent_at'>>(
  messages: T[],
  userId: string,
  lastReadAt: string | null,
): T[] {
  return messages.filter(
    (m) => m.author_id !== userId && (lastReadAt === null || m.sent_at > lastReadAt),
  );
}

/**
 * Opens (first ever call, listing_id doc absent) or polls a thread. Every
 * call — first open or a later poll — marks it read for the caller and
 * decrements their counter by exactly the messages that transition from
 * unread to read (UI §6.2 "marks the thread read", applied continuously so
 * the badge never climbs while the user is actively looking at the thread —
 * not just on the very first open). The whole read+decide+write happens
 * inside one transaction so `last_read_at` is only ever advanced past
 * messages actually counted in the decrement (Firestore retries the whole
 * function on a concurrent conflict, so a message arriving mid-transaction
 * is never silently skipped).
 */
export async function openOrPollThread(
  db: Firestore,
  listingId: string,
  userId: string,
): Promise<{ thread: ChatThread; messages: StoredMessage[]; wasCreated: boolean }> {
  const ref = threadRef(db, listingId);
  const readRef = ref.collection('reads').doc(userId);
  let wasCreated = false;

  const thread = await db.runTransaction(async (tx): Promise<ChatThread> => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      wasCreated = true;
      const created: Omit<ChatThread, 'created_at'> = {
        participant_ids: [userId],
        closed: false,
        closed_by: null,
        closed_at: null,
        last_message_at: null,
        last_message_preview: null,
        message_count: 0,
      };
      tx.set(ref, { ...created, created_at: FieldValue.serverTimestamp() });
      tx.set(readRef, { last_read_at: FieldValue.serverTimestamp() });
      return { ...created, created_at: new Date().toISOString() };
    }

    const existing = ChatThreadSchema.parse(firestoreToPlain(snap.data()));
    const messagesSnap = await tx.get(ref.collection('messages').orderBy('sent_at', 'asc'));
    const messages = messagesSnap.docs.map((d) =>
      ChatMessageSchema.parse(firestoreToPlain(d.data())),
    );
    const lastReadAt = await readLastReadAt(tx, readRef);

    const needsJoin = !existing.participant_ids.includes(userId);
    const newlyRead = unreadFrom(messages, userId, lastReadAt);

    if (needsJoin) tx.update(ref, { participant_ids: FieldValue.arrayUnion(userId) });
    tx.set(readRef, { last_read_at: FieldValue.serverTimestamp() }, { merge: true });
    if (newlyRead.length > 0) {
      tx.set(
        db.collection(COUNTERS).doc(userId),
        {
          unread_total: FieldValue.increment(-newlyRead.length),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return needsJoin
      ? { ...existing, participant_ids: [...existing.participant_ids, userId] }
      : existing;
  });

  const messages = await listMessages(db, listingId);
  return { thread, messages, wasCreated };
}

export interface SendMessageInput {
  authorId: string;
  body: RichTextNode | null;
  attachmentIds: string[];
}

/** Server-computed preview excerpt, or `''` for an attachment-only message —
 *  the server never composes user-facing prose (API_CONTRACT.md §1); an
 *  empty excerpt is the client's cue to show its own translated
 *  "attachment" placeholder on the *Le mie chat* list. */
function previewExcerpt(body: RichTextNode | null): string {
  if (body === null) return '';
  const plain = extractPlainText(body);
  return plain.length > 140 ? `${plain.slice(0, 140)}…` : plain;
}

/**
 * Sends a message: sanitizes the body, creates it, claims any referenced
 * attachments (must belong to this listing and not already be claimed by
 * another message — guards against a buggy/malicious client reusing an id),
 * updates the thread's denormalized facts, and increments every OTHER
 * participant's unread counter by one. Also joins the author as a
 * participant if they somehow aren't one yet (robustness — the normal UI
 * flow always opens, i.e. joins, before it can send).
 */
export async function sendMessage(
  db: Firestore,
  listingId: string,
  input: SendMessageInput,
): Promise<StoredMessage> {
  const ref = threadRef(db, listingId);
  const newMessageRef = ref.collection('messages').doc();
  const sanitizedBody = input.body ? sanitizeRichText(input.body) : null;
  const attachmentRefs = input.attachmentIds.map((id) => db.collection(ATTACHMENTS).doc(id));

  return db.runTransaction(async (tx): Promise<StoredMessage> => {
    const threadSnap = await tx.get(ref);
    if (!threadSnap.exists) throw new ApiError(404, 'errors.common.notFound');
    const thread = ChatThreadSchema.parse(firestoreToPlain(threadSnap.data()));
    if (thread.closed) throw new ApiError(409, 'errors.chat.threadClosed');

    const attachmentSnaps = await Promise.all(attachmentRefs.map((r) => tx.get(r)));
    for (const snap of attachmentSnaps) {
      if (!snap.exists) throw new ApiError(404, 'errors.common.notFound');
      const attachment = AttachmentSchema.parse(firestoreToPlain(snap.data()));
      if (attachment.listing_id !== listingId || attachment.message_id !== null) {
        throw new ApiError(400, 'errors.common.validation');
      }
    }

    const messageDoc = {
      author_id: input.authorId,
      sent_at: FieldValue.serverTimestamp(),
      body: sanitizedBody,
      attachment_ids: input.attachmentIds,
    };
    tx.set(newMessageRef, messageDoc);
    for (const attRef of attachmentRefs) {
      tx.update(attRef, { message_id: newMessageRef.id });
    }

    const needsJoin = !thread.participant_ids.includes(input.authorId);
    const threadUpdate: Record<string, unknown> = {
      last_message_at: FieldValue.serverTimestamp(),
      last_message_preview: { author_id: input.authorId, excerpt: previewExcerpt(sanitizedBody) },
      message_count: FieldValue.increment(1),
    };
    if (needsJoin) threadUpdate.participant_ids = FieldValue.arrayUnion(input.authorId);
    tx.update(ref, threadUpdate);

    for (const participantId of thread.participant_ids) {
      if (participantId === input.authorId) continue;
      tx.set(
        db.collection(COUNTERS).doc(participantId),
        { unread_total: FieldValue.increment(1), updated_at: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }

    return {
      id: newMessageRef.id,
      author_id: input.authorId,
      sent_at: new Date().toISOString(),
      body: sanitizedBody,
      attachment_ids: input.attachmentIds,
    };
  });
}

/** Adds a colleague (UI §6.2: any participant may add one, not just admins —
 *  see the phase plan's Scoperta chiave 4 for the companion
 *  participant-candidates endpoint). Idempotent: re-adding an existing
 *  participant is a no-op, not an error. Hands the new participant the
 *  entire existing conversation as unread — no read doc is created for them,
 *  so every message ever sent counts as unread until they actually open it. */
export async function addParticipant(
  db: Firestore,
  listingId: string,
  newUserId: string,
): Promise<ChatThread> {
  const ref = threadRef(db, listingId);
  return db.runTransaction(async (tx): Promise<ChatThread> => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'errors.common.notFound');
    const thread = ChatThreadSchema.parse(firestoreToPlain(snap.data()));
    if (thread.closed) throw new ApiError(409, 'errors.chat.threadClosed');
    if (thread.participant_ids.includes(newUserId)) return thread;

    tx.update(ref, { participant_ids: FieldValue.arrayUnion(newUserId) });
    tx.set(
      db.collection(COUNTERS).doc(newUserId),
      {
        unread_total: FieldValue.increment(thread.message_count),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ...thread, participant_ids: [...thread.participant_ids, newUserId] };
  });
}

async function setClosed(
  db: Firestore,
  listingId: string,
  actorId: string,
  closed: boolean,
): Promise<ChatThread> {
  const ref = threadRef(db, listingId);
  return db.runTransaction(async (tx): Promise<ChatThread> => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'errors.common.notFound');
    const thread = ChatThreadSchema.parse(firestoreToPlain(snap.data()));
    if (thread.closed === closed) return thread; // idempotent no-op

    const messagesSnap = await tx.get(ref.collection('messages').orderBy('sent_at', 'asc'));
    const messages = messagesSnap.docs.map((d) =>
      ChatMessageSchema.parse(firestoreToPlain(d.data())),
    );

    // Every read (before any write — transactions require reads-before-writes).
    const perParticipantUnread = new Map<string, number>();
    for (const participantId of thread.participant_ids) {
      const lastReadAt = await readLastReadAt(tx, ref.collection('reads').doc(participantId));
      perParticipantUnread.set(
        participantId,
        unreadFrom(messages, participantId, lastReadAt).length,
      );
    }

    // Closing subtracts this thread's contribution from every participant's
    // global counter ("stops counting toward unread indicators", UI §6.2);
    // reopening adds it back. No messages can arrive while closed, so the
    // amount to re-add on reopen always equals what was subtracted on close —
    // no stored snapshot needed, it's recomputed fresh both times.
    const sign = closed ? -1 : 1;
    for (const [participantId, unread] of perParticipantUnread) {
      if (unread === 0) continue;
      tx.set(
        db.collection(COUNTERS).doc(participantId),
        {
          unread_total: FieldValue.increment(sign * unread),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    tx.update(
      ref,
      closed
        ? { closed: true, closed_by: actorId, closed_at: FieldValue.serverTimestamp() }
        : { closed: false, closed_by: null, closed_at: null },
    );

    return {
      ...thread,
      closed,
      closed_by: closed ? actorId : null,
      closed_at: closed ? new Date().toISOString() : null,
    };
  });
}

export function close(db: Firestore, listingId: string, actorId: string): Promise<ChatThread> {
  return setClosed(db, listingId, actorId, true);
}

export function reopen(db: Firestore, listingId: string, actorId: string): Promise<ChatThread> {
  return setClosed(db, listingId, actorId, false);
}

/** The user's threads, most-recent activity first (UI §6.3) — bounded by how
 *  many threads THIS user participates in, never a fan-out over every thread
 *  in the system. */
export async function listMyThreads(
  db: Firestore,
  userId: string,
): Promise<Array<ChatThread & { listing_id: string }>> {
  const snap = await db
    .collection(THREADS)
    .where('participant_ids', 'array-contains', userId)
    .orderBy('last_message_at', 'desc')
    .get();
  return snap.docs.map((d) => ({
    listing_id: d.id,
    ...ChatThreadSchema.parse(firestoreToPlain(d.data())),
  }));
}

/** `listMyThreads` plus each thread's unread count for `userId` in one pass —
 *  used by `GET /chats` (both the *Le mie chat* screen and the table's
 *  per-row badge poll), avoiding the redundant thread-doc re-fetch that
 *  calling `unreadCountFor` once per item would cost. Closed threads always
 *  read 0 (UI §6.2). */
export async function listMyThreadsWithUnread(
  db: Firestore,
  userId: string,
): Promise<Array<ChatThread & { listing_id: string; unread: number }>> {
  const threads = await listMyThreads(db, userId);
  return Promise.all(
    threads.map(async (thread) => {
      if (thread.closed) return { ...thread, unread: 0 };
      const [messages, readDoc] = await Promise.all([
        listMessages(db, thread.listing_id),
        threadRef(db, thread.listing_id).collection('reads').doc(userId).get(),
      ]);
      const lastReadAt = readDoc.exists
        ? ReadStateSchema.parse(firestoreToPlain(readDoc.data())).last_read_at
        : null;
      return { ...thread, unread: unreadFrom(messages, userId, lastReadAt).length };
    }),
  );
}

/** Unread count for `userId` in one thread — read-only, no side effect
 *  (unlike `openOrPollThread`, this never marks anything read). Used by
 *  `GET /listings/:id`'s thread summary and by `listMyThreads`'s per-item
 *  `unread` field. A closed thread always reads 0 (UI §6.2: "stops counting
 *  toward unread indicators"). */
export async function unreadCountFor(
  db: Firestore,
  listingId: string,
  userId: string,
): Promise<number> {
  const thread = await getThread(db, listingId);
  if (thread === null || thread.closed) return 0;
  const readDoc = await threadRef(db, listingId).collection('reads').doc(userId).get();
  const lastReadAt = readDoc.exists
    ? ReadStateSchema.parse(firestoreToPlain(readDoc.data())).last_read_at
    : null;
  const messages = await listMessages(db, listingId);
  return unreadFrom(messages, userId, lastReadAt).length;
}
