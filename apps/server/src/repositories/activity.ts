// Repository — `listing_activity` (Part B, APP-OWNED, writable). Full ownership
// belongs to Phase 6; this phase writes ONLY the two system-observed transition
// events the snapshot rebuild detects (`listing_archived` /
// `listing_reactivated`, DATA_MODEL.md §12). Append-only.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { ActivityEventSchema, type ActivityEventType } from '@pvp/shared';

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
