// Repository — `user_counters` (Part B, DATA_MODEL.md §13). The single
// per-user document every screen's badge polls (`GET /chats/unread`) — never
// a fan-out over threads (SPECIFICATIONS.md §8). All the arithmetic that
// maintains this document lives in `repositories/chat.ts`, transactionally
// alongside the operation that triggers it; this file is read-only.
import type { Firestore } from 'firebase-admin/firestore';
import { UserCountersSchema } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'user_counters';

/** 0 for a user who has never had an unread message — the document is only
 *  ever created lazily, the first time an increment touches it. */
export async function getTotal(db: Firestore, userId: string): Promise<number> {
  const doc = await db.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return 0;
  return UserCountersSchema.parse(firestoreToPlain(doc.data())).unread_total;
}
