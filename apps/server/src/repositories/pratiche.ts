// Repository — `pratiche` (Part B): the hand-entered archived-case register.
// Document id is generated, not derived from `ndg` or `numero_pratica`:
// neither is reliably unique (one NDG owns several cases, and a case can be
// re-filed), so deriving the id would silently overwrite a real record the
// first time a duplicate is entered.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { PraticaSchema, type Pratica, type PraticaInput, type PraticaPatch } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'pratiche';

function parse(id: string, data: unknown): Pratica {
  return PraticaSchema.parse({ ...(firestoreToPlain(data) as object), id });
}

/** The whole register, newest first. Deliberately unpaged: the client filters
 *  and exports across the full set (see schemas/api/pratiche.ts). */
export async function listAll(db: Firestore): Promise<Pratica[]> {
  const snap = await db.collection(COLLECTION).orderBy('created_at', 'desc').get();
  return snap.docs.map((d) => parse(d.id, d.data()));
}

export async function getById(db: Firestore, id: string): Promise<Pratica | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return parse(doc.id, doc.data());
}

export async function create(
  db: Firestore,
  input: PraticaInput,
  createdBy: string,
): Promise<Pratica> {
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    ...input,
    created_at: FieldValue.serverTimestamp(),
    created_by: createdBy,
    updated_at: null,
    updated_by: null,
  });
  // Read back rather than echoing the input: `created_at` is resolved by the
  // server, so the echoed object would carry a sentinel where the client
  // expects a timestamp.
  const fresh = await getById(db, ref.id);
  if (!fresh) throw new Error(`pratica ${ref.id} disappeared immediately after creation`);
  return fresh;
}

/** Applies a partial change. Returns null when the document no longer exists,
 *  so the caller can answer 404 rather than resurrecting a deleted record
 *  through an implicit upsert (which `set` would do and `update` will not). */
export async function patch(
  db: Firestore,
  id: string,
  changes: PraticaPatch,
  updatedBy: string,
): Promise<Pratica | null> {
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) return null;
  await ref.update({
    ...changes,
    updated_at: FieldValue.serverTimestamp(),
    updated_by: updatedBy,
  });
  return getById(db, id);
}

/** True when a document was actually removed, false when there was nothing to
 *  remove — Firestore's delete succeeds either way, and the caller needs the
 *  difference to report an honest outcome. */
export async function remove(db: Firestore, id: string): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}
