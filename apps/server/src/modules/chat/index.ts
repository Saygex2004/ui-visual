// Chat module (API_CONTRACT.md §5, UI §6). No `config.auth.role` except
// close/reopen (admin only, UI §6.2) — any authenticated, non-must-change
// session may open/send/add, matching modules/ratings' "collective" default.
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import {
  ThreadsListResponseSchema,
  UnreadResponseSchema,
  ThreadResponseSchema,
  ThreadOnlyResponseSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  AddParticipantRequestSchema,
  ParticipantCandidatesResponseSchema,
  sanitizeRichText,
  extractPlainText,
  type ThreadListItem,
  type ThreadView,
  type ListingSummary,
  type ChatMessageView,
  type AttachmentDescriptor,
  type ChatThread,
  type Listing,
} from '@pvp/shared';
import {
  chatRepo,
  userCountersRepo,
  attachmentsRepo,
  listingsRepo,
  usersRepo,
  activityRepo,
} from '../../repositories/index.js';
import type { StoredMessage } from '../../repositories/chat.js';
import { ApiError } from '../../plugins/errorEnvelope.js';
import { firstHeaderValue } from '../../lib/http.js';

export interface ChatModuleDeps {
  db: Firestore;
  messageMaxChars: number;
}

/** id → username for every account, resolved once per request and reused
 *  across a whole thread's participants/messages — `GET /admin/users` (the
 *  only other id→username path) is admin-only, so this is the only way a
 *  regular participant can see a colleague's name (same reasoning as
 *  `ActivityEventView.actor_username` in Phase 6). One `listAll` read is
 *  cheaper than N individual `getById` calls at this team size (≤10). */
async function usernameMap(db: Firestore): Promise<Map<string, string>> {
  const users = await usersRepo.listAll(db);
  return new Map(users.map((u) => [u.id, u.username]));
}

/** `listing` is null exactly when the thread's own listing_id no longer
 *  resolves — never currently reachable (listings are never deleted), but
 *  the UI spec's "removed" placeholder (§6.2/§6.3) is defensive for it, and
 *  `listing_available` already anticipates the state (Scoperta chiave 5). */
function toListingSummary(listing: Listing | null): ListingSummary {
  return {
    listing_available: listing !== null,
    tipo_bene: listing?.tipo_bene ?? null,
    tribunale: listing?.tribunale ?? null,
    comune: listing?.comune ?? null,
    provincia: listing?.provincia ?? null,
    valore_richiesto: listing?.valore_richiesto ?? null,
    link: listing?.link ?? null,
  };
}

async function toThreadView(
  db: Firestore,
  listingId: string,
  thread: ChatThread,
  usernames: Map<string, string>,
): Promise<ThreadView> {
  const listing = await listingsRepo.getById(db, listingId);
  return {
    listing_id: listingId,
    participants: thread.participant_ids.map((id) => ({ id, username: usernames.get(id) ?? id })),
    closed: thread.closed,
    message_count: thread.message_count,
    listing: toListingSummary(listing),
  };
}

async function resolveAttachments(db: Firestore, ids: string[]): Promise<AttachmentDescriptor[]> {
  const attachments = await Promise.all(ids.map((id) => attachmentsRepo.getById(db, id)));
  return attachments
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .map((a) => ({
      id: a.id,
      filename: a.filename,
      content_type: a.content_type,
      size_bytes: a.size_bytes,
    }));
}

async function toMessageView(
  db: Firestore,
  message: StoredMessage,
  usernames: Map<string, string>,
): Promise<ChatMessageView> {
  return {
    id: message.id,
    author_id: message.author_id,
    author_username: usernames.get(message.author_id) ?? null,
    sent_at: message.sent_at,
    body: message.body,
    attachments: await resolveAttachments(db, message.attachment_ids),
  };
}

export function registerChatModule(app: FastifyInstance, deps: ChatModuleDeps): void {
  const { db, messageMaxChars } = deps;
  const adminOnly = { config: { auth: { role: 'admin' as const } } };

  app.get('/chats', async (req) => {
    const userId = req.user!.id;
    const [threads, usernames] = await Promise.all([
      chatRepo.listMyThreadsWithUnread(db, userId),
      usernameMap(db),
    ]);
    const items: ThreadListItem[] = await Promise.all(
      threads.map(async (thread): Promise<ThreadListItem> => {
        const listing = await listingsRepo.getById(db, thread.listing_id);
        return {
          listing_id: thread.listing_id,
          unread: thread.unread,
          closed: thread.closed,
          last_message_at: thread.last_message_at,
          preview: thread.last_message_preview,
          participants: thread.participant_ids.map((id) => ({
            id,
            username: usernames.get(id) ?? id,
          })),
          listing: toListingSummary(listing),
        };
      }),
    );
    return ThreadsListResponseSchema.parse({ threads: items });
  });

  app.get('/chats/unread', async (req, reply) => {
    const total = await userCountersRepo.getTotal(db, req.user!.id);
    // API_CONTRACT.md §10: "single-doc read, 304" — the whole response is
    // this one number, so it's its own ETag.
    const etag = `"${total}"`;
    reply.header('ETag', etag);
    const ifNoneMatch = firstHeaderValue(req.headers['if-none-match']);
    if (ifNoneMatch === etag) {
      return reply.code(304).send();
    }
    return UnreadResponseSchema.parse({ total });
  });

  app.get<{ Params: { listingId: string }; Querystring: { after?: string } }>(
    '/chats/:listingId',
    async (req) => {
      const { listingId } = req.params;
      const userId = req.user!.id;
      const [{ thread, messages, wasCreated }, usernames] = await Promise.all([
        chatRepo.openOrPollThread(db, listingId, userId),
        usernameMap(db),
      ]);

      if (wasCreated) {
        await activityRepo.appendEvent(db, {
          listing_id: listingId,
          type: 'thread_opened',
          actor_id: userId,
        });
      }

      const after = req.query.after;
      const cutoffIndex = after ? messages.findIndex((m) => m.id === after) : -1;
      // A stale/unknown cursor falls back to the full history rather than
      // erroring — the same "a stale link must never fail" stance the URL
      // search-param schemas already take (FRONTEND.md §2).
      const visibleMessages = cutoffIndex >= 0 ? messages.slice(cutoffIndex + 1) : messages;

      const views = await Promise.all(visibleMessages.map((m) => toMessageView(db, m, usernames)));
      return ThreadResponseSchema.parse({
        thread: await toThreadView(db, listingId, thread, usernames),
        messages: views,
      });
    },
  );

  app.post<{ Params: { listingId: string } }>('/chats/:listingId/messages', async (req) => {
    const { listingId } = req.params;
    const userId = req.user!.id;
    const body = SendMessageRequestSchema.parse(req.body);

    const sanitizedBody = body.body ? sanitizeRichText(body.body) : null;
    if (sanitizedBody && extractPlainText(sanitizedBody).length > messageMaxChars) {
      throw new ApiError(422, 'errors.chat.messageTooLong', { max: messageMaxChars });
    }

    const message = await chatRepo.sendMessage(db, listingId, {
      authorId: userId,
      body: sanitizedBody,
      attachmentIds: body.attachment_ids ?? [],
    });

    for (const attachmentId of message.attachment_ids) {
      const attachment = await attachmentsRepo.getById(db, attachmentId);
      await activityRepo.appendEvent(db, {
        listing_id: listingId,
        type: 'attachment_added',
        actor_id: userId,
        details: { filename: attachment?.filename ?? null },
      });
    }

    const usernames = await usernameMap(db);
    return SendMessageResponseSchema.parse({
      message: await toMessageView(db, message, usernames),
    });
  });

  app.post<{ Params: { listingId: string } }>('/chats/:listingId/participants', async (req) => {
    const { listingId } = req.params;
    const body = AddParticipantRequestSchema.parse(req.body);
    const [thread, usernames] = await Promise.all([
      chatRepo.addParticipant(db, listingId, body.user_id),
      usernameMap(db),
    ]);
    return ThreadOnlyResponseSchema.parse({
      thread: await toThreadView(db, listingId, thread, usernames),
    });
  });

  app.get<{ Params: { listingId: string } }>(
    '/chats/:listingId/participant-candidates',
    async (req) => {
      const { listingId } = req.params;
      const thread = await chatRepo.getThread(db, listingId);
      const currentParticipants = new Set(thread?.participant_ids ?? []);
      const allUsers = await usersRepo.listAll(db);
      const candidates = allUsers
        .filter((u) => !u.disabled && !currentParticipants.has(u.id))
        .map((u) => ({ id: u.id, username: u.username }));
      return ParticipantCandidatesResponseSchema.parse({ users: candidates });
    },
  );

  app.post<{ Params: { listingId: string } }>('/chats/:listingId/close', adminOnly, async (req) => {
    const { listingId } = req.params;
    const userId = req.user!.id;
    const [thread, usernames] = await Promise.all([
      chatRepo.close(db, listingId, userId),
      usernameMap(db),
    ]);
    await activityRepo.appendEvent(db, {
      listing_id: listingId,
      type: 'thread_closed',
      actor_id: userId,
    });
    return ThreadOnlyResponseSchema.parse({
      thread: await toThreadView(db, listingId, thread, usernames),
    });
  });

  app.post<{ Params: { listingId: string } }>(
    '/chats/:listingId/reopen',
    adminOnly,
    async (req) => {
      const { listingId } = req.params;
      const userId = req.user!.id;
      const [thread, usernames] = await Promise.all([
        chatRepo.reopen(db, listingId, userId),
        usernameMap(db),
      ]);
      await activityRepo.appendEvent(db, {
        listing_id: listingId,
        type: 'thread_reopened',
        actor_id: userId,
      });
      return ThreadOnlyResponseSchema.parse({
        thread: await toThreadView(db, listingId, thread, usernames),
      });
    },
  );
}
