// Part B — `pratiche_risposte`: le risposte alla richiesta di fascicolo,
// raccolte dalla casella di posta e mostrate sotto la pratica.
//
// Tutto qui dentro arriva DA FUORI: lo scrive chi risponde alla mail, non un
// utente autenticato. Di conseguenza ogni campo e' limitato in lunghezza, e il
// corpo viaggia come TESTO — mai come HTML. Una risposta non deve poter
// iniettare markup nella dashboard di chi la legge.
import { z } from 'zod';
import { instant } from '../common.js';

/** Un corpo di mail puo' essere lungo, ma non illimitato: un documento
 *  Firestore sta in 1 MB, e una risposta piu' lunga di questa e' quasi
 *  sempre una catena di citazioni, non contenuto. */
const CORPO_MAX = 20_000;

export const RispostaPraticaInputSchema = z.object({
  /** Id della pratica a cui la risposta appartiene, ricavato dall'indirizzo
   *  con il `+` a cui e' stata inviata. */
  pratica_id: z.string().trim().min(1).max(200),
  /** Chi ha risposto, come appare nell'intestazione `From`. */
  da: z.string().trim().min(1).max(300),
  oggetto: z.string().trim().max(500).default(''),
  /** Solo testo. Se il messaggio era in HTML, e' il mittente ad averne
   *  fornito anche la versione testuale, oppure lo script la ricava. */
  testo: z.string().max(CORPO_MAX),
  /** Quando e' arrivata nella casella, non quando l'abbiamo registrata:
   *  fra i due puo' passare qualche minuto e la prima e' quella vera. */
  ricevuta_il: instant,
  /** Message-ID del messaggio, per non registrare due volte la stessa
   *  risposta se lo script la ripropone. */
  message_id: z.string().trim().max(500).default(''),
});

export const RispostaPraticaSchema = RispostaPraticaInputSchema.extend({
  id: z.string(),
  registrata_il: instant,
});

export type RispostaPraticaInput = z.infer<typeof RispostaPraticaInputSchema>;
export type RispostaPratica = z.infer<typeof RispostaPraticaSchema>;
