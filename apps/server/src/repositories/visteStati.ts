// Repository — `viste_config/stati` (Part B). One fixed document: there is one
// answer to "is this view open", and no way to end up with two.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { VisteStatiSchema, type VisteStati, type VisteStatiInput } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'viste_config';
const DOC = 'stati';

/** Null when nobody has touched the switches — every view is then open. */
export async function get(db: Firestore): Promise<VisteStati | null> {
  const snap = await db.collection(COLLECTION).doc(DOC).get();
  if (!snap.exists) return null;
  return VisteStatiSchema.parse(firestoreToPlain(snap.data()));
}

export async function set(
  db: Firestore,
  input: VisteStatiInput,
  updatedBy: string,
): Promise<VisteStati> {
  const ref = db.collection(COLLECTION).doc(DOC);
  await ref.set({ ...input, updated_at: FieldValue.serverTimestamp(), updated_by: updatedBy });
  const fresh = await ref.get();
  return VisteStatiSchema.parse(firestoreToPlain(fresh.data()));
}
