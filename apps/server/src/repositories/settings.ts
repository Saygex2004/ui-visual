// Repository — `settings/extraction_categories` (Part A). READ side only in
// this phase; the WRITE (the one Part A write this application performs) arrives
// in Phase 5's admin task. Absent document → null ⇒ caller applies the default
// selection (DATA_MODEL.md §7, DOMAIN_RULES.md Appendix A).
import type { Firestore } from 'firebase-admin/firestore';
import { ExtractionCategoriesSchema, type ExtractionCategories } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'settings';
const DOC = 'extraction_categories';

export async function getExtractionCategories(db: Firestore): Promise<ExtractionCategories | null> {
  const doc = await db.collection(COLLECTION).doc(DOC).get();
  if (!doc.exists) return null;
  return ExtractionCategoriesSchema.parse(firestoreToPlain(doc.data()));
}
