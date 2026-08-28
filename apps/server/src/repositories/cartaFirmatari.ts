// Repository — `carta_anagrafica/firmatari` (Part B). A single fixed document:
// there is one list of signatories, and no way to end up with two.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { CartaFirmatariSchema, type CartaFirmatari, type CartaFirmatariInput } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'carta_anagrafica';
const DOC = 'firmatari';

/** Null when no administrator has customised the list — the caller then falls
 *  back to the names shipped in code, which is why nothing is pre-seeded. */
export async function get(db: Firestore): Promise<CartaFirmatari | null> {
  const snap = await db.collection(COLLECTION).doc(DOC).get();
  if (!snap.exists) return null;
  return CartaFirmatariSchema.parse(firestoreToPlain(snap.data()));
}

export async function set(
  db: Firestore,
  input: CartaFirmatariInput,
  updatedBy: string,
): Promise<CartaFirmatari> {
  const ref = db.collection(COLLECTION).doc(DOC);
  await ref.set({ ...input, updated_at: FieldValue.serverTimestamp(), updated_by: updatedBy });
  const fresh = await ref.get();
  return CartaFirmatariSchema.parse(firestoreToPlain(fresh.data()));
}

/** Drops the customisation, so the shipped names apply again. */
export async function reset(db: Firestore): Promise<void> {
  await db.collection(COLLECTION).doc(DOC).delete();
}
