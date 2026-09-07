// Repository — `carta_azienda` (Part B). Companies added from the admin panel,
// on top of the ones shipped in code. A generated document id: two companies
// can legitimately share a name (a group and its subsidiary), so the name is
// not an identity.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  CartaAziendaSchema,
  type CartaAzienda,
  type CartaAziendaInput,
  type CartaAziendaPatch,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'carta_azienda';

export async function listAll(db: Firestore): Promise<CartaAzienda[]> {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((d) => CartaAziendaSchema.parse({ ...(firestoreToPlain(d.data()) as object), id: d.id }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

export async function create(
  db: Firestore,
  input: CartaAziendaInput,
  createdBy: string,
): Promise<CartaAzienda> {
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    ...input,
    created_at: FieldValue.serverTimestamp(),
    created_by: createdBy,
    updated_at: null,
    updated_by: null,
  });
  const fresh = await ref.get();
  return CartaAziendaSchema.parse({ ...(firestoreToPlain(fresh.data()) as object), id: ref.id });
}

/** Null when the id is unknown, so the route can answer 404 rather than
 *  creating a document nobody asked for. */
export async function patch(
  db: Firestore,
  id: string,
  changes: CartaAziendaPatch,
  updatedBy: string,
): Promise<CartaAzienda | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const before = await ref.get();
  if (!before.exists) return null;
  await ref.update({
    ...changes,
    updated_at: FieldValue.serverTimestamp(),
    updated_by: updatedBy,
  });
  const fresh = await ref.get();
  return CartaAziendaSchema.parse({ ...(firestoreToPlain(fresh.data()) as object), id });
}

export async function remove(db: Firestore, id: string): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}
