// Repository — `omi_prices` (Part A, READ-ONLY). Read as a lookup map keyed by
// the composite slug (the document id), DATA_MODEL.md §4.
import type { Firestore } from 'firebase-admin/firestore';
import { OmiPriceSchema, type OmiPrice } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'omi_prices';

export async function getAllBySlug(db: Firestore): Promise<Record<string, OmiPrice>> {
  const snap = await db.collection(COLLECTION).get();
  const map: Record<string, OmiPrice> = {};
  for (const doc of snap.docs) {
    map[doc.id] = OmiPriceSchema.parse(firestoreToPlain(doc.data()));
  }
  return map;
}
