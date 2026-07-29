// Repository — `calendar_days` + the assignment engine's transactional
// orchestration (Part B, DATA_MODEL.md §11, SPECIFICATIONS.md §12).
//
// Two DIFFERENT concurrency guarantees are at play here, not one:
//  1. Same user, same day (two tabs opening "today" at once) — guarded by the
//     deterministic `calendar_days/{user_id}_{date}` document id: Firestore
//     retries a transaction whose read set changed before commit, so the
//     loser of a create-if-absent race simply re-reads the winner's result
//     instead of drawing a second time.
//  2. Different users' concurrent draws overlapping the same eligible pool —
//     NOT covered by (1) alone (they're two different `calendar_days` docs).
//     Guarded by reading `assignment_index` INSIDE the transaction: Firestore
//     tracks conflicts on query reads too (not just single-document reads),
//     so if another concurrent transaction commits a new entry that would
//     have changed the pool this transaction read, this one is retried
//     automatically with fresh data. `listings` (the active pool) is read
//     OUTSIDE the transaction — a listing's own fields don't race against
//     assignment, only `assignment_index` membership does.
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import {
  CalendarDaySchema,
  isEligibleForCalendar,
  diversifiedDraw,
  DEFAULT_CALENDAR_TARGET,
  type CalendarDay,
  type DiversifiableListing,
  type Listing,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';
// Direct sibling import, not the `./index.js` barrel: the barrel re-exports
// this very file as `calendarRepo`, so importing it here would be circular.
import * as listingsRepo from './listings.js';

const DAYS_COLLECTION = 'calendar_days';
const ASSIGNMENT_COLLECTION = 'assignment_index';

function dayDocId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

/** Server's own idea of "today" (UTC — no timezone configuration exists in
 *  this project), never the client's claim: `GET /calendar/day/:date`'s
 *  auto-assign trigger compares the requested date against this. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// CalendarDaySchema doesn't carry the doc id (it's derivable, `user_id_date`);
// callers that need it (module layer, for `GET .../:userId/:date`) already
// have `userId`/`date` from their own request, so we just return the parsed
// fields here rather than threading an `id` through every caller.
function toDayFields(data: unknown): CalendarDay {
  return CalendarDaySchema.parse(firestoreToPlain(data));
}

export async function getDay(
  db: Firestore,
  userId: string,
  date: string,
): Promise<CalendarDay | null> {
  const doc = await db.collection(DAYS_COLLECTION).doc(dayDocId(userId, date)).get();
  if (!doc.exists) return null;
  return toDayFields(doc.data());
}

/** Every day a user has for a given `YYYY-MM` month (month view, UI §7.1). A
 *  half-open `[monthStart, nextMonthStart)` range on the string-sortable
 *  `date` field avoids needing to know the month's exact length. */
export async function listDaysForMonth(
  db: Firestore,
  userId: string,
  month: string,
): Promise<CalendarDay[]> {
  const monthStart = `${month}-01`;
  const nextMonthStart = `${nextYearMonth(month)}-01`;
  const snap = await db
    .collection(DAYS_COLLECTION)
    .where('user_id', '==', userId)
    .where('date', '>=', monthStart)
    .where('date', '<', nextMonthStart)
    .get();
  return snap.docs.map((doc) => toDayFields(doc.data()));
}

function nextYearMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** The eligible pool as of right now, minus whatever `assignment_index` ids
 *  are passed in (read separately, transactionally or not, by the caller). */
function eligiblePool(
  activeImmobili: readonly Listing[],
  assignedIds: ReadonlySet<string>,
): DiversifiableListing[] {
  return activeImmobili.filter((l) =>
    isEligibleForCalendar(l, { hasAssignmentEntry: assignedIds.has(String(l.id)) }),
  );
}

async function readAssignedIds(tx: Transaction, db: Firestore): Promise<Set<string>> {
  const snap = await tx.get(db.collection(ASSIGNMENT_COLLECTION));
  return new Set(snap.docs.map((d) => d.id));
}

export interface AssignResult {
  listingIds: string[];
  /** Only the ids newly written by THIS call (empty on a mere re-read of an
   *  already-existing day) — the module layer appends `calendar_assigned`
   *  activity events for exactly these, never for a re-read. */
  newlyAssignedIds: string[];
  wasCreated: boolean;
}

/**
 * Automatic, once-per-day assignment (UI §7.3). Create-if-absent only — never
 * adds to a day that already exists, regardless of who created it or how.
 * The caller (module layer) is responsible for only invoking this when
 * `date` is server-computed "today"; this function itself doesn't know or
 * care what day today is, it just does the transactional get-or-create.
 */
export async function assignToday(
  db: Firestore,
  userId: string,
  date: string,
  target: number = DEFAULT_CALENDAR_TARGET,
): Promise<AssignResult> {
  const activeImmobili = await listingsRepo.getActiveByScope(db, 'immobili');
  const dayRef = db.collection(DAYS_COLLECTION).doc(dayDocId(userId, date));

  return db.runTransaction(async (tx) => {
    const dayDoc = await tx.get(dayRef);
    if (dayDoc.exists) {
      const existing = toDayFields(dayDoc.data());
      return { listingIds: existing.listing_ids, newlyAssignedIds: [], wasCreated: false };
    }

    const assignedIds = await readAssignedIds(tx, db);
    const pool = eligiblePool(activeImmobili, assignedIds);
    const drawn = diversifiedDraw(pool, target, `${userId}:${date}`);

    const now = FieldValue.serverTimestamp();
    tx.set(dayRef, {
      user_id: userId,
      date,
      listing_ids: drawn,
      generated: 'auto',
      created_at: now,
      updated_at: now,
    });
    for (const id of drawn) {
      tx.set(db.collection(ASSIGNMENT_COLLECTION).doc(id), {
        assigned_to: userId,
        date,
        assigned_at: now,
        completed_at: null,
      });
    }
    return { listingIds: drawn, newlyAssignedIds: drawn, wasCreated: true };
  });
}

/**
 * Admin random assignment (UI §8.3.1) — same engine, but ALWAYS draws `count`
 * more and adds them, whether or not the day already exists (additive, never
 * duplicates). `generated` becomes `'mixed'` when adding to a pre-existing
 * `'auto'` day, stays `'admin'`/`'mixed'` otherwise, or starts as `'admin'`
 * on a fresh day.
 */
export async function randomAssign(
  db: Firestore,
  userId: string,
  date: string,
  count: number,
): Promise<AssignResult> {
  const activeImmobili = await listingsRepo.getActiveByScope(db, 'immobili');
  const dayRef = db.collection(DAYS_COLLECTION).doc(dayDocId(userId, date));

  return db.runTransaction(async (tx) => {
    const dayDoc = await tx.get(dayRef);
    const assignedIds = await readAssignedIds(tx, db);
    const pool = eligiblePool(activeImmobili, assignedIds);
    const drawn = diversifiedDraw(pool, count, `${userId}:${date}:admin:${assignedIds.size}`);

    const now = FieldValue.serverTimestamp();
    if (!dayDoc.exists) {
      // A plain array literal is always safe to `.set()`, even empty (an
      // exhausted pool on a brand-new day is a legitimate, if unusual, result).
      tx.set(dayRef, {
        user_id: userId,
        date,
        listing_ids: drawn,
        generated: 'admin',
        created_at: now,
        updated_at: now,
      });
    } else if (drawn.length > 0) {
      // `FieldValue.arrayUnion()` throws when called with zero arguments —
      // an exhausted pool means nothing to add, so skip the write entirely
      // rather than risk that call with an empty spread.
      const existing = toDayFields(dayDoc.data());
      tx.update(dayRef, {
        listing_ids: FieldValue.arrayUnion(...drawn),
        generated: existing.generated === 'auto' ? 'mixed' : existing.generated,
        updated_at: now,
      });
    }
    for (const id of drawn) {
      tx.set(db.collection(ASSIGNMENT_COLLECTION).doc(id), {
        assigned_to: userId,
        date,
        assigned_at: now,
        completed_at: null,
      });
    }
    const listingIds = dayDoc.exists
      ? [...toDayFields(dayDoc.data()).listing_ids, ...drawn]
      : drawn;
    return { listingIds, newlyAssignedIds: drawn, wasCreated: !dayDoc.exists };
  });
}

export interface SkippedAssignment {
  id: string;
  reason: 'not_found' | 'completed';
}

export interface ByIdAssignResult {
  assigned: string[];
  skipped: SkippedAssignment[];
}

/**
 * Admin by-id assignment (UI §8.3.3) — the only path corporate listings enter
 * a calendar. Skips only "nonexistent" and "already completed" (the two
 * reasons API_CONTRACT.md §7 names) — deliberately NOT "already assigned to
 * someone else": `assignment_index`'s single `assigned_to` field is
 * necessarily last-write-wins on a reassignment (same precedent as
 * `ratings.ts`'s `setValue`), which is a real, useful admin workflow (moving
 * an uncompleted assignment from one team member to another) rather than an
 * inconsistency to guard against. The OTHER user's `calendar_days` keeps its
 * own record regardless — that's the frozen-history guarantee working as
 * intended, not a bug.
 */
export async function byIdAssign(
  db: Firestore,
  userId: string,
  date: string,
  listingIds: readonly string[],
): Promise<ByIdAssignResult> {
  const uniqueIds = [...new Set(listingIds)];
  const [immobili, corporate] = await Promise.all([
    listingsRepo.getByScope(db, 'immobili'),
    listingsRepo.getByScope(db, 'corporate'),
  ]);
  const existingListings = new Map(
    [...immobili.active, ...immobili.archived, ...corporate.active, ...corporate.archived].map(
      (l) => [String(l.id), l] as const,
    ),
  );

  const dayRef = db.collection(DAYS_COLLECTION).doc(dayDocId(userId, date));

  return db.runTransaction(async (tx) => {
    const dayDoc = await tx.get(dayRef);
    const candidateRefs = uniqueIds
      .filter((id) => existingListings.has(id))
      .map((id) => db.collection(ASSIGNMENT_COLLECTION).doc(id));
    const candidateDocs = candidateRefs.length > 0 ? await tx.getAll(...candidateRefs) : [];
    const completedIds = new Set(
      candidateDocs.filter((d) => d.exists && d.data()?.completed_at != null).map((d) => d.id),
    );

    const skipped: SkippedAssignment[] = [];
    const toAssign: string[] = [];
    for (const id of uniqueIds) {
      if (!existingListings.has(id)) skipped.push({ id, reason: 'not_found' });
      else if (completedIds.has(id)) skipped.push({ id, reason: 'completed' });
      else toAssign.push(id);
    }

    const now = FieldValue.serverTimestamp();
    if (toAssign.length > 0) {
      if (!dayDoc.exists) {
        tx.set(dayRef, {
          user_id: userId,
          date,
          listing_ids: toAssign,
          generated: 'admin',
          created_at: now,
          updated_at: now,
        });
      } else {
        const existing = toDayFields(dayDoc.data());
        tx.update(dayRef, {
          listing_ids: FieldValue.arrayUnion(...toAssign),
          generated: existing.generated === 'auto' ? 'mixed' : existing.generated,
          updated_at: now,
        });
      }
      for (const id of toAssign) {
        tx.set(db.collection(ASSIGNMENT_COLLECTION).doc(id), {
          assigned_to: userId,
          date,
          assigned_at: now,
          completed_at: null,
        });
      }
    }
    return { assigned: toAssign, skipped };
  });
}

/**
 * Removal (UI §8.3.2) — severs the calendar link only. The `assignment_index`
 * entry is deleted ONLY when not completed (DATA_MODEL.md §11: completion is
 * permanent even off the calendar); a completed entry, and the rating/listing
 * themselves, are never touched.
 */
export async function removeAssignments(
  db: Firestore,
  userId: string,
  date: string,
  listingIds: readonly string[],
): Promise<{ removed: string[] }> {
  const dayRef = db.collection(DAYS_COLLECTION).doc(dayDocId(userId, date));

  return db.runTransaction(async (tx) => {
    const dayDoc = await tx.get(dayRef);
    if (!dayDoc.exists) return { removed: [] };

    const existing = toDayFields(dayDoc.data());
    const toRemove = listingIds.filter((id) => existing.listing_ids.includes(id));
    if (toRemove.length === 0) return { removed: [] };

    const refs = toRemove.map((id) => db.collection(ASSIGNMENT_COLLECTION).doc(id));
    const docs = await tx.getAll(...refs);

    tx.update(dayRef, {
      listing_ids: FieldValue.arrayRemove(...toRemove),
      updated_at: FieldValue.serverTimestamp(),
    });
    for (const doc of docs) {
      if (doc.exists && doc.data()?.completed_at == null) tx.delete(doc.ref);
    }
    return { removed: toRemove };
  });
}
