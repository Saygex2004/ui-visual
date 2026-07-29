// Integration — attachments module, HTTP layer + real Storage emulator
// (TESTING.md §3, API_CONTRACT.md §6). Multipart bodies are built with Node's
// built-in `FormData`/`Request` (global since Node 18, no extra dependency)
// via the well-known `new Request(url, {body: formData}).arrayBuffer()`
// trick to get correctly-encoded bytes plus the boundary-bearing
// Content-Type header `light-my-request` (Fastify's inject engine) needs.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Timestamp } from 'firebase-admin/firestore';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import type { SnapshotCache } from '../../cache/index.js';
import { reseed, testDb } from '../../testSupport/emulator.js';
import { loginAs } from '../../testSupport/auth.js';
import { getBucket } from '../../storage.js';
import { sweepOrphanAttachments } from './index.js';

const TEST_ENV = {
  PVPDASH_FIRESTORE_PROJECT_ID: 'demo-pvp-dashboard',
  PVPDASH_SESSION_SECRET: 'x'.repeat(32),
  PVPDASH_ENV: 'production',
  PVPDASH_LOG_LEVEL: 'silent',
  PVPDASH_META_POLL_SECONDS: '3600',
  PVPDASH_SESSION_TTL_DAYS: '30',
  PVPDASH_ATTACH_MAX_MB: '1', // 1 MB, small on purpose — makes an "oversized" fixture cheap to build
} satisfies NodeJS.ProcessEnv;

async function clearMustChange(userId: string): Promise<void> {
  await testDb().collection('users').doc(userId).update({ must_change_password: false });
}

async function multipartUpload(
  fieldName: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<{ body: Buffer; contentType: string }> {
  const form = new FormData();
  // `new Uint8Array(buffer)` (not the Buffer itself): Node's Buffer type is
  // backed by ArrayBufferLike (which includes SharedArrayBuffer), while
  // BlobPart wants a plain ArrayBuffer-backed view — a real runtime no-op,
  // just a type mismatch `tsc` catches.
  form.append(fieldName, new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
  const req = new Request('http://localhost/', { method: 'POST', body: form });
  const body = Buffer.from(await req.arrayBuffer());
  return { body, contentType: req.headers.get('content-type')! };
}

describe('attachments module (HTTP, over the real Firestore + Storage emulators)', () => {
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

  it('a valid upload writes both the blob and the metadata doc, message_id null until claimed', async () => {
    const { body, contentType } = await multipartUpload(
      'file',
      Buffer.from('%PDF-1.4 fake pdf content'),
      'perizia.pdf',
      'application/pdf',
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/attachments?listing_id=1055',
      headers: { cookie: mrossiCookie, 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    const attachmentId = res.json().attachment.id as string;
    expect(res.json().attachment).toMatchObject({
      filename: 'perizia.pdf',
      content_type: 'application/pdf',
    });

    const doc = await testDb().collection('attachments').doc(attachmentId).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()!.message_id).toBeNull();
    expect(doc.data()!.listing_id).toBe('1055');

    const bucket = getBucket('demo-pvp-dashboard');
    const [exists] = await bucket.file(doc.data()!.storage_path as string).exists();
    expect(exists).toBe(true);
  });

  it('an oversized upload is refused with 413 before any blob is written', async () => {
    const oversized = Buffer.alloc(2 * 1024 * 1024, 'x'); // 2 MB > the 1 MB test limit
    const { body, contentType } = await multipartUpload(
      'file',
      oversized,
      'big.pdf',
      'application/pdf',
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/attachments?listing_id=1055',
      headers: { cookie: mrossiCookie, 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.key).toBe('errors.attachments.tooLarge');

    const snap = await testDb().collection('attachments').where('filename', '==', 'big.pdf').get();
    expect(snap.empty).toBe(true);
  });

  it('a disallowed content type is refused with 415', async () => {
    const { body, contentType } = await multipartUpload(
      'file',
      Buffer.from('#!/bin/sh\necho hi'),
      'script.sh',
      'application/x-sh',
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/attachments?listing_id=1055',
      headers: { cookie: mrossiCookie, 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(415);
    expect(res.json().error.key).toBe('errors.attachments.type');

    const snap = await testDb()
      .collection('attachments')
      .where('filename', '==', 'script.sh')
      .get();
    expect(snap.empty).toBe(true);
  });

  it("a signed download URL requires the caller to participate in the attachment's thread", async () => {
    // att-1 (fixture) belongs to listing 1001, message m2 — 1001's participants
    // are user-1 and user-admin-1 only.
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie: adminCookie },
      payload: { username: 'estraneo', password: 'Whatever123!', role: 'user' },
    });
    const outsiderId = forbidden.json().user.id as string;
    await clearMustChange(outsiderId);
    const outsiderCookie = await loginAs(app, 'estraneo', 'Whatever123!');

    const denied = await app.inject({
      method: 'GET',
      url: '/api/attachments/att-1/url',
      headers: { cookie: outsiderCookie },
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: 'GET',
      url: '/api/attachments/att-1/url',
      headers: { cookie: mrossiCookie },
    });
    expect(allowed.statusCode).toBe(200);
    expect(typeof allowed.json().url).toBe('string');
    expect(allowed.json().url.length).toBeGreaterThan(0);
  });

  it('the orphan sweep deletes an old, never-claimed upload but leaves a recent or referenced one untouched', async () => {
    const bucket = getBucket('demo-pvp-dashboard');
    const oldRef = testDb().collection('attachments').doc();
    const oldPath = `attachments/1055/${oldRef.id}`;
    await oldRef.set({
      listing_id: '1055',
      message_id: null,
      uploader_id: 'user-1',
      filename: 'vecchio.pdf',
      content_type: 'application/pdf',
      size_bytes: 3,
      storage_path: oldPath,
      uploaded_at: Timestamp.fromMillis(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days old
    });
    await bucket.file(oldPath).save(Buffer.from('old'));

    const recentRef = testDb().collection('attachments').doc();
    const recentPath = `attachments/1055/${recentRef.id}`;
    await recentRef.set({
      listing_id: '1055',
      message_id: null,
      uploader_id: 'user-1',
      filename: 'recente.pdf',
      content_type: 'application/pdf',
      size_bytes: 3,
      storage_path: recentPath,
      uploaded_at: Timestamp.now(),
    });
    await bucket.file(recentPath).save(Buffer.from('new'));

    const swept = await sweepOrphanAttachments(testDb(), bucket, 24 * 60 * 60 * 1000);
    expect(swept).toBe(1);

    expect((await oldRef.get()).exists).toBe(false);
    expect((await bucket.file(oldPath).exists())[0]).toBe(false);
    expect((await recentRef.get()).exists).toBe(true);
    expect((await bucket.file(recentPath).exists())[0]).toBe(true);

    // att-1 (fixture) is claimed (message_id: 'm2') and old — must survive
    // regardless of age, since it's referenced.
    expect((await testDb().collection('attachments').doc('att-1').get()).exists).toBe(true);
  });
});
