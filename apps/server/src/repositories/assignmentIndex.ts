// Repository — `assignment_index` (Part B, DATA_MODEL.md §11). `ensureCompleted`
// is Phase 6's — a transaction (not a plain read-then-write) because "set
// once, never overwritten" is a real correctness invariant, the same category
// of guarantee this codebase already reaches for a transaction elsewhere
// (e.g. username-claim on create). The plain reads below are Phase 8's: the
// calendar engine's own transactional assignment writes live in
// `repositories/calendar.ts` (they need the SAME `tx` the calendar_days write
// uses, so they're not routed through a shared helper here).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { AssignmentIndexEntrySchema, type AssignmentIndexEntry } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'assignment_index';

export interface AssignmentIndexRecord extends AssignmentIndexEntry {
  id: string;
}

function toRecord(id: string, data: unknown): AssignmentIndexRecord {
  return { id, ...AssignmentIndexEntrySchema.parse(firestoreToPlain(data)) };
}

export async function getById(
  db: Firestore,
  listingId: string,
): Promise<AssignmentIndexRecord | null> {
  const doc = await db.collection(COLLECTION).doc(listingId).get();
  if (!doc.exists) return null;
  return toRecord(doc.id, doc.data());
}

/** Every entry, keyed by listing id — the eligibility pool (auto/random
 *  assignment) and the month/day progress computations both need "is there
 *  an entry at all" / "is it completed" for a potentially large id set, and
 *  this collection is small at this team's scale (DOMAIN_RULES.md §8). */
export async function listAll(db: Firestore): Promise<Map<string, AssignmentIndexRecord>> {
  const snap = await db.collection(COLLECTION).get();
  const map = new Map<string, AssignmentIndexRecord>();
  for (const doc of snap.docs) map.set(doc.id, toRecord(doc.id, doc.data()));
  return map;
}

/** A specific, bounded id set (e.g. one day's listings, or by-id search
 *  results) — a batched read, cheaper than `listAll` when the candidate set
 *  is already known and small. */
export async function getMany(
  db: Firestore,
  ids: readonly string[],
): Promise<Map<string, AssignmentIndexRecord>> {
  const map = new Map<string, AssignmentIndexRecord>();
  if (ids.length === 0) return map;
  const refs = ids.map((id) => db.collection(COLLECTION).doc(id));
  const docs = await db.getAll(...refs);
  for (const doc of docs) if (doc.exists) map.set(doc.id, toRecord(doc.id, doc.data()));
  return map;
}

/**
 * Marks a listing completed if it isn't already. A pre-existing entry with a
 * real calendar assignment (Phase 8) keeps its `assigned_to`/`date` untouched;
 * an entry created here from scratch (a listing rated without ever being
 * assigned) carries `assigned_to`/`date`/`assigned_at` as `null`.
 */
export async function ensureCompleted(db: Firestore, listingId: string): Promise<void> {
  const ref = db.collection(COLLECTION).doc(listingId);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      tx.set(ref, {
        assigned_to: null,
        date: null,
        assigned_at: null,
        completed_at: FieldValue.serverTimestamp(),
      });
      return;
    }
    if (doc.data()?.completed_at != null) return; // already completed — permanent, never overwritten
    tx.update(ref, { completed_at: FieldValue.serverTimestamp() });
  });
}
