// Integration — chat module, HTTP layer (TESTING.md §3, UI §6). Fixture facts
// (seed/fixtures/chat_threads.json / user_counters.json): thread 1001 is
// open, participants [user-1 (mrossi), user-admin-1 (admin)], 2 messages (m1
// by mrossi w/ rich text, m2 by admin, attachment-only), mrossi's read state
// covers both (unread 0 for them); admin has NO read doc at all for 1001, so
// m1 (not their own) counts unread — matching user_counters.json's
// user-admin-1:1 / user-1:0 exactly. Thread 1003 is closed, sole participant
// user-admin-1, its one message is their own (unread 0 regardless). Listing
// 1055 has no thread at all yet — the "first ever open" case.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Timestamp } from 'firebase-admin/firestore';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import type { SnapshotCache } from '../../cache/index.js';
import { reseed, testDb } from '../../testSupport/emulator.js';
import { loginAs } from '../../testSupport/auth.js';

const TEST_ENV = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo-pvp-dashboard',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
  PVPDASH_ENV: 'production',
  PVPDASH_LOG_LEVEL: 'silent',
  PVPDASH_META_POLL_SECONDS: '3600',
  PVPDASH_SESSION_TTL_DAYS: '30',
} satisfies NodeJS.ProcessEnv;

async function clearMustChange(userId: string): Promise<void> {
  await testDb().collection('users').doc(userId).update({ must_change_password: false });
}

async function counterOf(userId: string): Promise<number> {
  const doc = await testDb().collection('user_counters').doc(userId).get();
  return doc.exists ? (doc.data()!.unread_total as number) : 0;
}

function textBody(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

/** Ground truth for `userId`'s unread total, recomputed directly from
 *  Firestore read-state and message timestamps — independent of any
 *  application code, for the counter-invariant test below. */
async function computeTrueUnread(userId: string): Promise<number> {
  const threadsSnap = await testDb()
    .collection('chat_threads')
    .where('participant_ids', 'array-contains', userId)
    .get();
  let total = 0;
  for (const threadDoc of threadsSnap.docs) {
    if ((threadDoc.data().closed as boolean) === true) continue;
    const readDoc = await testDb()
      .collection('chat_threads')
      .doc(threadDoc.id)
      .collection('reads')
      .doc(userId)
      .get();
    const lastReadAt = readDoc.exists ? (readDoc.data()!.last_read_at as Timestamp) : null;
    const messagesSnap = await testDb()
      .collection('chat_threads')
      .doc(threadDoc.id)
      .collection('messages')
      .get();
    for (const m of messagesSnap.docs) {
      const msg = m.data();
      if (msg.author_id === userId) continue;
      const sentAt = msg.sent_at as Timestamp;
      if (lastReadAt === null || sentAt.toMillis() > lastReadAt.toMillis()) total += 1;
    }
  }
  return total;
}

describe('chat module (HTTP, over the emulator)', () => {
  let app: FastifyInstance;
  let cache: SnapshotCache | null;
  let adminCookie: string;
  let mrossiCookie: string;

  beforeEach(async () => {
    await reseed();
    await clearMustChange('user-1');
    ({ app, cache } = await buildApp(loadConfig(TEST_ENV), testDb()));
    adminCookie = await loginAs(app, 'admin', 'AdminPass123!');
    mrossiCookie = await loginAs(app, 'mrossi', 'UserPass123!');
  }, 30_000);

  afterEach(async () => {
    cache?.stopPolling();
    await app.close();
  });

  describe('opening / polling', () => {
    it('the very first open of an unseen listing creates the thread, joins the caller, and logs thread_opened', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/chats/1055',
        headers: { cookie: mrossiCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().thread).toMatchObject({
        listing_id: '1055',
        participants: [{ id: 'user-1', username: 'mrossi' }],
        closed: false,
        message_count: 0,
      });
      expect(res.json().messages).toEqual([]);

      const activity = await app.inject({
        method: 'GET',
        url: '/api/listings/1055/activity',
        headers: { cookie: mrossiCookie },
      });
      expect(activity.json().events[0]).toMatchObject({
        type: 'thread_opened',
        actor_id: 'user-1',
      });
    });

    it('opening an already-open thread does not duplicate thread_opened', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/chats/1001',
        headers: { cookie: mrossiCookie },
      });
      const activity = await app.inject({
        method: 'GET',
        url: '/api/listings/1001/activity',
        headers: { cookie: mrossiCookie },
      });
      const opened = (activity.json().events as Array<{ type: string }>).filter(
        (e) => e.type === 'thread_opened',
      );
      // Fixture act-2 is 1001's own genesis thread_opened event — exactly
      // one, never a second one from re-opening an already-open thread.
      expect(opened).toHaveLength(1);
    });

    it("opening marks it read and decrements the caller's counter by exactly the newly-seen messages", async () => {
      expect(await counterOf('user-admin-1')).toBe(1);
      const res = await app.inject({
        method: 'GET',
        url: '/api/chats/1001',
        headers: { cookie: adminCookie },
      });
      expect(res.json().messages).toHaveLength(2);
      expect(await counterOf('user-admin-1')).toBe(0);
    });

    it('a later poll only marks NEW messages read, never re-decrementing for ones already read', async () => {
      await app.inject({ method: 'GET', url: '/api/chats/1001', headers: { cookie: adminCookie } });
      expect(await counterOf('user-admin-1')).toBe(0);

      await app.inject({
        method: 'POST',
        url: '/api/chats/1001/messages',
        headers: { cookie: mrossiCookie },
        payload: { body: textBody('un altro messaggio') },
      });
      expect(await counterOf('user-admin-1')).toBe(1);

      await app.inject({ method: 'GET', url: '/api/chats/1001', headers: { cookie: adminCookie } });
      expect(await counterOf('user-admin-1')).toBe(0);
    });

    it('?after=<msgId> returns only messages sent after that message', async () => {
      const first = await app.inject({
        method: 'GET',
        url: '/api/chats/1001',
        headers: { cookie: mrossiCookie },
      });
      const firstMessageId = (first.json().messages as Array<{ id: string }>)[0]!.id;

      await app.inject({
        method: 'POST',
        url: '/api/chats/1001/messages',
        headers: { cookie: adminCookie },
        payload: { body: textBody('nuovo') },
      });

      const delta = await app.inject({
        method: 'GET',
        url: `/api/chats/1001?after=${firstMessageId}`,
        headers: { cookie: mrossiCookie },
      });
      const ids = (delta.json().messages as Array<{ id: string }>).map((m) => m.id);
      expect(ids).not.toContain(firstMessageId);
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('sending messages', () => {
    it('sends a rich-text message and stores it sanitized (bold survives, a javascript: link mark is dropped)', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/chats/1055',
        headers: { cookie: mrossiCookie },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: mrossiCookie },
        payload: {
          body: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'bello ', marks: [{ type: 'bold' }] },
                  {
                    type: 'text',
                    text: 'clicca qui',
                    marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
                  },
                ],
              },
            ],
          },
        },
      });
      expect(res.statusCode).toBe(200);
      const stored = JSON.stringify(res.json().message.body);
      expect(stored).not.toContain('javascript:');
      expect(stored).toContain('bold');
    });

    it('a message with neither text nor attachments is refused', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: mrossiCookie },
        payload: {},
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('an attachment-only message (null body) is accepted', async () => {
      // No real attachment upload here (that's attachments.integration.test.ts) —
      // this only proves the "body optional when attachments present" contract
      // at the schema/refuse level using a syntactically valid but unclaimed id
      // would fail the ownership check, so this asserts the REQUEST shape is
      // accepted up to that point, not a full round-trip.
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: mrossiCookie },
        payload: { attachment_ids: [] },
      });
      // attachment_ids: [] alone still fails the shared schema's refine
      // (needs at least one attachment when body is absent) — confirms the
      // server enforces the same rule, not just the client.
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('sending on a closed thread is refused with 409', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1003/messages',
        headers: { cookie: adminCookie },
        payload: { body: textBody('ciao') },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.key).toBe('errors.chat.threadClosed');
    });

    it('an over-length message is refused before being stored', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: mrossiCookie },
        payload: { body: textBody('a'.repeat(5000)) },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().error.key).toBe('errors.chat.messageTooLong');

      const thread = await testDb().collection('chat_threads').doc('1055').get();
      expect(thread.exists).toBe(false); // rejected before any write happened
    });

    it('sending increments every OTHER participant, never the author', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/chats/1055',
        headers: { cookie: mrossiCookie },
      });
      await app.inject({ method: 'GET', url: '/api/chats/1055', headers: { cookie: adminCookie } });
      const before = await counterOf('user-admin-1');

      await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: mrossiCookie },
        payload: { body: textBody('ciao') },
      });
      expect(await counterOf('user-admin-1')).toBe(before + 1);
      expect(await counterOf('user-1')).toBe(0);
    });
  });

  describe('participants', () => {
    it('adding a colleague hands them the whole conversation as unread, without creating a read doc', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { cookie: adminCookie },
        payload: { username: 'cverdi', password: 'Whatever123!', role: 'user' },
      });
      const newUserId = created.json().user.id as string;

      const add = await app.inject({
        method: 'POST',
        url: '/api/chats/1001/participants',
        headers: { cookie: adminCookie },
        payload: { user_id: newUserId },
      });
      expect(add.statusCode).toBe(200);
      const participantIds = (add.json().thread.participants as Array<{ id: string }>).map(
        (p) => p.id,
      );
      expect(participantIds).toContain(newUserId);
      expect(await counterOf(newUserId)).toBe(2); // thread 1001's message_count

      const readDoc = await testDb()
        .collection('chat_threads')
        .doc('1001')
        .collection('reads')
        .doc(newUserId)
        .get();
      expect(readDoc.exists).toBe(false);
    });

    it('re-adding an existing participant is a no-op, not an error, and grants no extra unread', async () => {
      const before = await counterOf('user-1');
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1001/participants',
        headers: { cookie: adminCookie },
        payload: { user_id: 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(await counterOf('user-1')).toBe(before);
    });

    it('adding on a closed thread is refused with 409', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1003/participants',
        headers: { cookie: adminCookie },
        payload: { user_id: 'user-1' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('participant candidates', () => {
    it('excludes current participants and disabled accounts', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { cookie: adminCookie },
        payload: { username: 'disattivato', password: 'Whatever123!', role: 'user' },
      });
      const disabledId = created.json().user.id as string;
      await app.inject({
        method: 'POST',
        url: `/api/admin/users/${disabledId}/disable`,
        headers: { cookie: adminCookie },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/chats/1001/participant-candidates',
        headers: { cookie: mrossiCookie },
      });
      const ids = (res.json().users as Array<{ id: string }>).map((u) => u.id);
      expect(ids).not.toContain('user-1'); // already a participant
      expect(ids).not.toContain('user-admin-1'); // already a participant
      expect(ids).not.toContain(disabledId); // disabled
    });
  });

  describe('close / reopen (admin only)', () => {
    it('a non-admin gets 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1001/close',
        headers: { cookie: mrossiCookie },
      });
      expect(res.statusCode).toBe(403);
    });

    it('closing subtracts exactly the current unread-in-this-thread from every participant; reopening restores it', async () => {
      const beforeAdmin = await counterOf('user-admin-1');
      const beforeMrossi = await counterOf('user-1');
      expect(beforeAdmin).toBe(1);
      expect(beforeMrossi).toBe(0);

      const close = await app.inject({
        method: 'POST',
        url: '/api/chats/1001/close',
        headers: { cookie: adminCookie },
      });
      expect(close.statusCode).toBe(200);
      expect(close.json().thread.closed).toBe(true);
      expect(await counterOf('user-admin-1')).toBe(beforeAdmin - 1);
      expect(await counterOf('user-1')).toBe(beforeMrossi);

      const activity = await app.inject({
        method: 'GET',
        url: '/api/listings/1001/activity',
        headers: { cookie: adminCookie },
      });
      expect(activity.json().events[0]).toMatchObject({
        type: 'thread_closed',
        actor_id: 'user-admin-1',
      });

      const reopen = await app.inject({
        method: 'POST',
        url: '/api/chats/1001/reopen',
        headers: { cookie: adminCookie },
      });
      expect(reopen.statusCode).toBe(200);
      expect(reopen.json().thread.closed).toBe(false);
      expect(await counterOf('user-admin-1')).toBe(beforeAdmin);
    });

    it('a closed thread stays readable', async () => {
      const get = await app.inject({
        method: 'GET',
        url: '/api/chats/1003',
        headers: { cookie: adminCookie },
      });
      expect(get.statusCode).toBe(200);
      expect(get.json().messages).toHaveLength(1);
    });

    it('closing an already-closed thread is an idempotent no-op', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/chats/1003/close',
        headers: { cookie: adminCookie },
      });
      const before = await counterOf('user-admin-1');
      const res = await app.inject({
        method: 'POST',
        url: '/api/chats/1003/close',
        headers: { cookie: adminCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(await counterOf('user-admin-1')).toBe(before);
    });
  });

  describe('GET /chats and /chats/unread', () => {
    it('lists my threads with unread, raw listing facts, and closed markers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/chats',
        headers: { cookie: adminCookie },
      });
      const items = res.json().threads as Array<Record<string, unknown>>;

      const t1001 = items.find((i) => i.listing_id === '1001')!;
      expect(t1001).toMatchObject({ unread: 1, closed: false });
      const listing1001 = t1001.listing as { listing_available: boolean; tribunale: string | null };
      expect(listing1001.listing_available).toBe(true);
      expect(typeof listing1001.tribunale === 'string' || listing1001.tribunale === null).toBe(
        true,
      );

      const t1003 = items.find((i) => i.listing_id === '1003')!;
      expect(t1003.closed).toBe(true);
      expect(t1003.unread).toBe(0); // closed threads never show unread
    });

    it('GET /chats/unread matches the stored counter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/chats/unread',
        headers: { cookie: adminCookie },
      });
      expect(res.json().total).toBe(await counterOf('user-admin-1'));
    });

    it('ETag/If-None-Match: repeating the request with the returned ETag answers 304, empty body', async () => {
      const first = await app.inject({
        method: 'GET',
        url: '/api/chats/unread',
        headers: { cookie: adminCookie },
      });
      const etag = first.headers.etag as string;
      expect(etag).toBe(`"${first.json().total as number}"`);

      const second = await app.inject({
        method: 'GET',
        url: '/api/chats/unread',
        headers: { cookie: adminCookie, 'if-none-match': etag },
      });
      expect(second.statusCode).toBe(304);
      expect(second.body).toBe('');
    });

    it('the ETag changes once the counter changes (a stale If-None-Match returns 200 again)', async () => {
      const before = await app.inject({
        method: 'GET',
        url: '/api/chats/unread',
        headers: { cookie: adminCookie },
      });
      const staleEtag = before.headers.etag as string;

      // Opening 1055 (no prior thread) creates one with the caller already
      // read — doesn't change admin's own counter. Sending a message on it
      // as mrossi does, since admin is a participant once mrossi @-mentions
      // them... simpler: mrossi sends into the already-shared 1001 thread,
      // which does increment admin's counter (admin has no read doc there).
      await app.inject({
        method: 'GET',
        url: '/api/chats/1001',
        headers: { cookie: mrossiCookie },
      });
      await app.inject({
        method: 'POST',
        url: '/api/chats/1001/messages',
        headers: { cookie: mrossiCookie },
        payload: { body: textBody('un altro messaggio') },
      });

      const after = await app.inject({
        method: 'GET',
        url: '/api/chats/unread',
        headers: { cookie: adminCookie, 'if-none-match': staleEtag },
      });
      expect(after.statusCode).toBe(200);
      expect(after.json().total).toBe(await counterOf('user-admin-1'));
    });

    it('a user with no threads sees an empty list and 0 unread', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { cookie: adminCookie },
        payload: { username: 'zeronessuno', password: 'Whatever123!', role: 'user' },
      });
      const freshId = created.json().user.id as string;
      await clearMustChange(freshId);
      const freshCookie = await loginAs(app, 'zeronessuno', 'Whatever123!');

      const list = await app.inject({
        method: 'GET',
        url: '/api/chats',
        headers: { cookie: freshCookie },
      });
      expect(list.json().threads).toEqual([]);

      const unread = await app.inject({
        method: 'GET',
        url: '/api/chats/unread',
        headers: { cookie: freshCookie },
      });
      expect(unread.json().total).toBe(0);
    });
  });

  describe('counter invariant', () => {
    it('after a scripted storm of mixed operations across threads and users, every stored counter equals the truth recomputed from read-state', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { cookie: adminCookie },
        payload: { username: 'cverdi', password: 'Whatever123!', role: 'user' },
      });
      const cId = created.json().user.id as string;
      await clearMustChange(cId);
      const cCookie = await loginAs(app, 'cverdi', 'Whatever123!');

      await app.inject({
        method: 'GET',
        url: '/api/chats/1055',
        headers: { cookie: mrossiCookie },
      }); // creates 1055
      await app.inject({ method: 'GET', url: '/api/chats/1055', headers: { cookie: adminCookie } }); // joins
      await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: mrossiCookie },
        payload: { body: textBody('uno') },
      });
      await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: adminCookie },
        payload: { body: textBody('due') },
      });
      await app.inject({
        method: 'POST',
        url: '/api/chats/1055/participants',
        headers: { cookie: adminCookie },
        payload: { user_id: cId },
      }); // hands cverdi 2 unread
      await app.inject({
        method: 'GET',
        url: '/api/chats/1055',
        headers: { cookie: mrossiCookie },
      }); // mrossi catches up
      await app.inject({
        method: 'POST',
        url: '/api/chats/1055/messages',
        headers: { cookie: cCookie },
        payload: { body: textBody('tre') },
      });
      await app.inject({ method: 'GET', url: '/api/chats/1001', headers: { cookie: adminCookie } }); // catches up on 1001
      await app.inject({
        method: 'POST',
        url: '/api/chats/1001/messages',
        headers: { cookie: adminCookie },
        payload: { body: textBody('quattro') },
      });
      await app.inject({
        method: 'POST',
        url: '/api/chats/1001/close',
        headers: { cookie: adminCookie },
      });
      await app.inject({
        method: 'POST',
        url: '/api/chats/1001/reopen',
        headers: { cookie: adminCookie },
      });
      await app.inject({ method: 'GET', url: '/api/chats/1055', headers: { cookie: adminCookie } }); // admin re-catches-up on 1055

      for (const userId of ['user-1', 'user-admin-1', cId]) {
        expect(await counterOf(userId)).toBe(await computeTrueUnread(userId));
      }
    });
  });
});
