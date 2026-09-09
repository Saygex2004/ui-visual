// Repository — `pratiche_risposte` (Part B). Documenti scritti da un canale
// esterno (lo script sulla casella di posta), letti dalla finestra di una
// pratica.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  RispostaPraticaSchema,
  type RispostaPratica,
  type RispostaPraticaInput,
} from '@pvp/shared';
import { firestoreToPlain } from './convert.js';

const COLLECTION = 'pratiche_risposte';

/** Le risposte di una pratica, dalla piu' vecchia alla piu' recente — l'ordine
 *  in cui si legge una conversazione. */
export async function listByPratica(db: Firestore, praticaId: string): Promise<RispostaPratica[]> {
  const snap = await db.collection(COLLECTION).where('pratica_id', '==', praticaId).get();
  return snap.docs
    .map((d) =>
      RispostaPraticaSchema.parse({ ...(firestoreToPlain(d.data()) as object), id: d.id }),
    )
    .sort((a, b) => a.ricevuta_il.localeCompare(b.ricevuta_il));
}

/** Registra una risposta, saltandola se quel Message-ID e' gia' presente.
 *
 *  Lo script che le raccoglie puo' ripassare sullo stesso messaggio — a un
 *  nuovo avvio, o se una chiamata va a vuoto dopo essere stata elaborata — e
 *  senza questo controllo la stessa risposta comparirebbe due volte sotto la
 *  pratica. Restituisce `false` quando era gia' nota. */
export async function create(
  db: Firestore,
  input: RispostaPraticaInput,
): Promise<{ risposta: RispostaPratica; nuova: boolean }> {
  if (input.message_id) {
    const gia = await db
      .collection(COLLECTION)
      .where('message_id', '==', input.message_id)
      .limit(1)
      .get();
    const doc = gia.docs[0];
    if (doc) {
      return {
        risposta: RispostaPraticaSchema.parse({
          ...(firestoreToPlain(doc.data()) as object),
          id: doc.id,
        }),
        nuova: false,
      };
    }
  }
  const ref = db.collection(COLLECTION).doc();
  await ref.set({ ...input, registrata_il: FieldValue.serverTimestamp() });
  const fresh = await ref.get();
  return {
    risposta: RispostaPraticaSchema.parse({
      ...(firestoreToPlain(fresh.data()) as object),
      id: ref.id,
    }),
    nuova: true,
  };
}
