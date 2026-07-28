// Repository — `ratings` (Part B, DATA_MODEL.md §10). Document id = listing
// id. Plain read-then-write (no transaction) — ratings are last-write-wins by
// design (no optimistic-lock error exists to translate, API_CONTRACT.md §4).
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  RatingSchema,
  ActivityEventSchema,
  type Rating,
  type RatingValue,
  type RatingDeltaEntry,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'ratings';
const ACTIVITY_COLLECTION = 'listing_activity';

function toDeltaEntry(listingId: string, rating: Rating): RatingDeltaEntry {
  return {
    listing_id: listingId,
    value: rating.value,
    set_by: rating.set_by,
    set_at: rating.set_at,
  };
}

export async function getById(db: Firestore, listingId: string): Promise<Rating | null> {
  const doc = await db.collection(COLLECTION).doc(listingId).get();
  if (!doc.exists) return null;
  return RatingSchema.parse(firestoreToPlain(doc.data()));
}

/** Sets/changes the shared rating. Returns the fresh value plus whatever was
 *  there before (null on a first-ever rating) so the caller can tell
 *  `rating_set` from `rating_changed` and build the activity `details`. */
export async function setValue(
  db: Firestore,
  listingId: string,
  params: { value: RatingValue; setBy: string },
): Promise<{ rating: Rating; previous: Rating | null }> {
  const previous = await getById(db, listingId);
  await db.collection(COLLECTION).doc(listingId).set({
    value: params.value,
    set_by: params.setBy,
    set_at: FieldValue.serverTimestamp(),
  });
  const rating = await getById(db, listingId);
  return { rating: rating!, previous };
}

/** Clears (deletes) the rating — an unrated listing stores nothing
 *  (DATA_MODEL.md §10). Idempotent: clearing an already-unrated listing
 *  returns `null` and writes nothing, rather than erroring. */
export async function clear(db: Firestore, listingId: string): Promise<Rating | null> {
  const previous = await getById(db, listingId);
  if (previous === null) return null;
  await db.collection(COLLECTION).doc(listingId).delete();
  return previous;
}

/**
 * Ratings changed since `since` (exclusive), or the full current state when
 * `since` is null. Clearing DELETES the `ratings` document (§10), so a
 * cleared rating can never surface from a query against `ratings` itself —
 * tombstones (`{value: null}`) are reconstructed instead from the
 * `rating_cleared` events `listing_activity` already records (append-only,
 * never deleted), skipping any listing that was re-rated within the same
 * window (its live entry already reflects the current truth, and returning
 * both would let a client apply them out of order and wrongly null it out).
 */
export async function getSince(
  db: Firestore,
  since: string | null,
): Promise<{ ratings: RatingDeltaEntry[]; now: string }> {
  const now = new Date().toISOString();

  if (since === null) {
    const snap = await db.collection(COLLECTION).get();
    const ratings = snap.docs.map((doc) =>
      toDeltaEntry(doc.id, RatingSchema.parse(firestoreToPlain(doc.data()))),
    );
    return { ratings, now };
  }

  const sinceTs = Timestamp.fromDate(new Date(since));

  const liveSnap = await db.collection(COLLECTION).where('set_at', '>', sinceTs).get();
  const live = new Map<string, RatingDeltaEntry>();
  for (const doc of liveSnap.docs) {
    live.set(doc.id, toDeltaEntry(doc.id, RatingSchema.parse(firestoreToPlain(doc.data()))));
  }

  const clearedSnap = await db
    .collection(ACTIVITY_COLLECTION)
    .where('type', '==', 'rating_cleared')
    .where('at', '>', sinceTs)
    .get();
  const tombstoned = new Set<string>();
  const tombstones: RatingDeltaEntry[] = [];
  for (const doc of clearedSnap.docs) {
    const event = ActivityEventSchema.parse(firestoreToPlain(doc.data()));
    if (live.has(event.listing_id) || tombstoned.has(event.listing_id)) continue;
    tombstoned.add(event.listing_id);
    tombstones.push({ listing_id: event.listing_id, value: null, set_by: null, set_at: null });
  }

  return { ratings: [...live.values(), ...tombstones], now };
}
