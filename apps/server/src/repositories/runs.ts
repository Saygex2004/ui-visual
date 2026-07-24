// Repository — `runs` (Part A, READ-ONLY). Display-only audit trail; no feature
// may depend on its contents (DATA_MODEL.md §1, §6).
import type { Firestore } from 'firebase-admin/firestore';
import { RunSchema, type Run } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'runs';

export async function getRecent(db: Firestore, limit = 20): Promise<Run[]> {
  const snap = await db.collection(COLLECTION).orderBy('started_at', 'desc').limit(limit).get();
  return snap.docs.map((doc) => RunSchema.parse(firestoreToPlain(doc.data())));
}
