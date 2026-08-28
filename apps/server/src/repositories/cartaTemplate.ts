// Repository — `carta_template` (Part B). Document id is the document type,
// so there is exactly one override per type and no way to accumulate two.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  CartaTemplateSchema,
  type CartaTemplate,
  type CartaTemplateInput,
  type TipoTemplate,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'carta_template';

/** Only the overridden types. The caller falls back to the shipped defaults
 *  for everything absent, which is why nothing is pre-seeded here. */
export async function listAll(db: Firestore): Promise<CartaTemplate[]> {
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map((d) =>
    CartaTemplateSchema.parse({ ...(firestoreToPlain(d.data()) as object), tipo: d.id }),
  );
}

export async function set(
  db: Firestore,
  tipo: TipoTemplate,
  input: CartaTemplateInput,
  updatedBy: string,
): Promise<CartaTemplate> {
  const ref = db.collection(COLLECTION).doc(tipo);
  await ref.set({ ...input, updated_at: FieldValue.serverTimestamp(), updated_by: updatedBy });
  const fresh = await ref.get();
  return CartaTemplateSchema.parse({ ...(firestoreToPlain(fresh.data()) as object), tipo });
}

/** Drops the override, so the type goes back to the text shipped in code. */
export async function reset(db: Firestore, tipo: TipoTemplate): Promise<void> {
  await db.collection(COLLECTION).doc(tipo).delete();
}
