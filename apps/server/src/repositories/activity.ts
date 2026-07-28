// Repository — `listing_activity` (Part B, APP-OWNED, writable). Append-only;
// no update/delete ever. `appendEvent` was introduced in an earlier phase for
// the two system-observed transition events the snapshot rebuild detects
// (`listing_archived` / `listing_reactivated`); Phase 6 adds the first read
// (the workspace timeline) and starts writing rating events too.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { ActivityEventSchema, type ActivityEvent, type ActivityEventType } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'listing_activity';

export interface NewActivityEvent {
  listing_id: string;
  type: ActivityEventType;
  actor_id: string | null; // null for system-observed events
  details?: Record<string, unknown>;
}

/** Append one immutable activity event (server assigns `at`). */
export async function appendEvent(db: Firestore, event: NewActivityEvent): Promise<void> {
  // Guard the logical shape against the shared schema before writing.
  ActivityEventSchema.parse({
    listing_id: event.listing_id,
    type: event.type,
    actor_id: event.actor_id,
    at: new Date().toISOString(),
    details: event.details ?? {},
  });
  await db.collection(COLLECTION).add({
    listing_id: event.listing_id,
    type: event.type,
    actor_id: event.actor_id,
    at: FieldValue.serverTimestamp(),
    details: event.details ?? {},
  });
}

/** One listing's timeline, newest first (UI §4.5). */
export async function listByListingId(
  db: Firestore,
  listingId: string,
  limit = 200,
): Promise<ActivityEvent[]> {
  const snap = await db
    .collection(COLLECTION)
    .where('listing_id', '==', listingId)
    .orderBy('at', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ActivityEventSchema.parse(firestoreToPlain(doc.data())));
}
