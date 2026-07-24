// Repository — `meta` (Part A, READ-ONLY). Three well-known docs; also the
// cache-invalidation signal (SPECIFICATIONS.md §8). Absent doc → null (the
// never-fetched fallback handled by mapRefreshMetadata).
import type { Firestore } from 'firebase-admin/firestore';
import {
  ScopeMetaSchema,
  OmiMetaSchema,
  type ScopeMeta,
  type OmiMeta,
  type Scope,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'meta';

export async function getScopeMeta(db: Firestore, scope: Scope): Promise<ScopeMeta | null> {
  const doc = await db.collection(COLLECTION).doc(scope).get();
  if (!doc.exists) return null;
  return ScopeMetaSchema.parse(firestoreToPlain(doc.data()));
}

export async function getOmiMeta(db: Firestore): Promise<OmiMeta | null> {
  const doc = await db.collection(COLLECTION).doc('omi').get();
  if (!doc.exists) return null;
  return OmiMetaSchema.parse(firestoreToPlain(doc.data()));
}
