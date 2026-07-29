// Repository — `listings` (Part A, READ-ONLY). DATA_MODEL.md §8 guarantees the
// equality-shaped queries used here. A single scope read is partitioned into
// active/archived in memory (avoids an equality+inequality composite index),
// which is also exactly what the snapshot builder needs per rebuild.
import type { Firestore } from 'firebase-admin/firestore';
import { ListingSchema, type Listing, type Scope } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'listings';

export interface ScopeListings {
  active: Listing[];
  archived: Listing[];
}

/** Read every listing of a scope once, partitioned by archival state. */
export async function getByScope(db: Firestore, scope: Scope): Promise<ScopeListings> {
  const snap = await db.collection(COLLECTION).where('scope', '==', scope).get();
  const active: Listing[] = [];
  const archived: Listing[] = [];
  for (const doc of snap.docs) {
    const listing = ListingSchema.parse(firestoreToPlain(doc.data()));
    if (listing.archived_at === null) active.push(listing);
    else archived.push(listing);
  }
  return { active, archived };
}

export async function getActiveByScope(db: Firestore, scope: Scope): Promise<Listing[]> {
  return (await getByScope(db, scope)).active;
}

export async function getArchivedByScope(db: Firestore, scope: Scope): Promise<Listing[]> {
  return (await getByScope(db, scope)).archived;
}

/** One listing by id (the PVP decimal string). Null when absent. */
export async function getById(db: Firestore, id: string): Promise<Listing | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return ListingSchema.parse(firestoreToPlain(doc.data()));
}

/** Many listings by id, in one batched read (calendar day rows — up to ~200
 *  ids, API_CONTRACT.md §7). Missing ids are simply absent from the result,
 *  not an error — a frozen day can reference an id that later disappears. */
export async function getByIds(db: Firestore, ids: readonly string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const refs = ids.map((id) => db.collection(COLLECTION).doc(id));
  const docs = await db.getAll(...refs);
  return docs.filter((d) => d.exists).map((d) => ListingSchema.parse(firestoreToPlain(d.data())));
}
