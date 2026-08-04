// Repository — `procedure_concorsuali` (Part A, READ-ONLY). Read as a lookup
// map keyed by the join tuple (DOMAIN_RULES.md §12, DATA_MODEL.md §17) --
// not the document id, unlike listings/omi_prices. A document lacking a
// parseable rg/tribunale.chiave yields no key and is skipped, never crashes
// the read (same "incomplete source record" tolerance the join itself has).
import type { Firestore } from 'firebase-admin/firestore';
import {
  ProceduraConcorsualeSchema,
  proceduraDocKey,
  type ProceduraConcorsualeDoc,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'procedure_concorsuali';

export async function getAllByKey(db: Firestore): Promise<Record<string, ProceduraConcorsualeDoc>> {
  const snap = await db.collection(COLLECTION).get();
  const map: Record<string, ProceduraConcorsualeDoc> = {};
  for (const doc of snap.docs) {
    const parsed = ProceduraConcorsualeSchema.parse(
      firestoreToPlain(doc.data()),
    ) as ProceduraConcorsualeDoc;
    const key = proceduraDocKey(parsed);
    if (key !== null) map[key] = parsed;
  }
  return map;
}
