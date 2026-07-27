// Repository — `settings/extraction_categories` (Part A). `setExtractionCategories`
// is THE ONLY PART A WRITE IN THIS CODEBASE (00_OVERVIEW.md §5, DATA_MODEL.md
// §7, UI §8.2) — admin-gated at the route, named explicitly as the one
// exception in repositories.integration.test.ts's structural read-only test.
// Absent document → null ⇒ caller applies the default selection
// (DOMAIN_RULES.md Appendix A).
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { ExtractionCategoriesSchema, type ExtractionCategories } from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'settings';
const DOC = 'extraction_categories';

export async function getExtractionCategories(db: Firestore): Promise<ExtractionCategories | null> {
  const doc = await db.collection(COLLECTION).doc(DOC).get();
  if (!doc.exists) return null;
  return ExtractionCategoriesSchema.parse(firestoreToPlain(doc.data()));
}

export async function setExtractionCategories(
  db: Firestore,
  params: { codes: readonly string[]; updatedBy: string },
): Promise<void> {
  await db.collection(COLLECTION).doc(DOC).set({
    codes: params.codes,
    updated_at: FieldValue.serverTimestamp(),
    updated_by: params.updatedBy,
  });
}
