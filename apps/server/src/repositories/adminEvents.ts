// Repository — `admin_events` (DATA_MODEL.md §15, Part B). Append-only
// lifecycle audit trail.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { AdminEventSchema, type AdminEventType } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'admin_events';

export interface NewAdminEvent {
  type: AdminEventType;
  actor_id: string;
  subject: string; // a user id, or 'settings/extraction_categories'
  details?: Record<string, unknown>;
}

export async function append(db: Firestore, event: NewAdminEvent): Promise<void> {
  AdminEventSchema.parse({
    type: event.type,
    actor_id: event.actor_id,
    subject: event.subject,
    at: new Date().toISOString(),
    details: event.details ?? {},
  });
  await db.collection(COLLECTION).add({
    type: event.type,
    actor_id: event.actor_id,
    subject: event.subject,
    at: FieldValue.serverTimestamp(),
    details: event.details ?? {},
  });
}

export async function listRecent(db: Firestore, limit = 100) {
  const snap = await db.collection(COLLECTION).orderBy('at', 'desc').limit(limit).get();
  return snap.docs.map((doc) => AdminEventSchema.parse(firestoreToPlain(doc.data())));
}
