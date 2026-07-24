// Repository — `sessions` (DATA_MODEL.md §9, Part B). Document id is the sha256
// hash of the raw session token (never the token itself — see
// lib/sessionToken.ts). Long-lived, renewed on use, revocable server-side.
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { SessionSchema, type Session } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';
import { generateSessionToken, hashSessionToken } from '../lib/sessionToken.js';

const SESSIONS = 'sessions';

export interface CreatedSession {
  token: string; // raw — goes in the cookie, never stored
  hash: string; // the document id
  expiresAt: Date;
}

export async function create(
  db: Firestore,
  userId: string,
  ttlDays: number,
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const hash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await db
    .collection(SESSIONS)
    .doc(hash)
    .set({
      user_id: userId,
      created_at: FieldValue.serverTimestamp(),
      last_used_at: FieldValue.serverTimestamp(),
      expires_at: Timestamp.fromDate(expiresAt),
    });

  return { token, hash, expiresAt };
}

export async function getByHash(db: Firestore, hash: string): Promise<Session | null> {
  const doc = await db.collection(SESSIONS).doc(hash).get();
  if (!doc.exists) return null;
  return SessionSchema.parse(firestoreToPlain(doc.data()));
}

/** Bump `last_used_at` — "renewed on use" (SPECIFICATIONS.md §7). Callers
 *  throttle how often this is invoked; see the auth plugin. */
export async function touch(db: Firestore, hash: string, ttlDays: number): Promise<void> {
  await db
    .collection(SESSIONS)
    .doc(hash)
    .update({
      last_used_at: FieldValue.serverTimestamp(),
      expires_at: Timestamp.fromDate(new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)),
    });
}

export async function deleteByHash(db: Firestore, hash: string): Promise<void> {
  await db.collection(SESSIONS).doc(hash).delete();
}

/** Revoke every session for a user (password change, disable). */
export async function deleteAllForUser(db: Firestore, userId: string): Promise<void> {
  const snap = await db.collection(SESSIONS).where('user_id', '==', userId).get();
  const bw = db.bulkWriter();
  for (const doc of snap.docs) bw.delete(doc.ref);
  await bw.close();
}

/** Revoke every OTHER session for a user, keeping `keepHash` (self-service
 *  password change — API_CONTRACT.md §2). */
export async function deleteOtherSessionsForUser(
  db: Firestore,
  userId: string,
  keepHash: string,
): Promise<void> {
  const snap = await db.collection(SESSIONS).where('user_id', '==', userId).get();
  const bw = db.bulkWriter();
  for (const doc of snap.docs) {
    if (doc.id !== keepHash) bw.delete(doc.ref);
  }
  await bw.close();
}
