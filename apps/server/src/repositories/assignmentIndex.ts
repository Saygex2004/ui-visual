// Repository — `assignment_index` (Part B, DATA_MODEL.md §11). Full CRUD for
// calendar assignment itself is Phase 8's job; this phase owns exactly one
// write path — recording a rating's completion, permanently. A transaction
// (not a plain read-then-write) because "set once, never overwritten" is a
// real correctness invariant, the same category of guarantee this codebase
// already reaches for a transaction elsewhere (e.g. username-claim on create).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION = 'assignment_index';

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
