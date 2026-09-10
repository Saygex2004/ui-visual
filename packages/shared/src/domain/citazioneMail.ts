// Chi risponde a una mail si porta dietro la mail originale: quasi tutti i
// programmi di posta la ricopiano sotto la risposta, preceduta da una riga
// tipo `Il giorno … ha scritto:` e con ogni riga marcata da `>`. In una scheda
// che si legge di fretta quel blocco è rumore: è una copia di ciò che abbiamo
// scritto noi, ed è più lungo della risposta vera.
//
// Il taglio avviene alla LETTURA, non alla ricezione: il testo arrivato resta
// registrato per intero. Sono comunicazioni su fascicoli, e un'euristica che
// sbaglia non deve poter cancellare quello che qualcuno ha davvero scritto —
// chi legge può sempre riaprire la parte tagliata e vedere tutto.

export interface CorpoRisposta {
  /** Quello che ha scritto chi risponde. */
  nuovo: string;
  /** La mail precedente, ricopiata dal programma di posta. Stringa vuota se
   *  non ce n'è, o se tagliarla non lascerebbe niente da leggere. */
  citato: string;
}

/** Quante righe dopo l'apertura di un'attribuzione se ne cerca la chiusura.
 *
 *  Serve perché l'attribuzione va spesso a capo da sola: Gmail spezza
 *  `Il giorno gio 10 set 2026 alle ore 10:13 <indirizzo@esempio> ha scritto:`
 *  proprio dentro l'indirizzo, e cercarla tutta su una riga sola non
 *  troverebbe niente. */
const RIGHE_ATTRIBUZIONE = 4;

/** Apertura di un'attribuzione. Da sola non decide nulla: una risposta può
 *  cominciare con «Il giorno in cui ci siamo sentiti…», quindi deve chiudersi
 *  con `ha scritto:` entro poche righe perché conti come citazione. */
const APERTURA = /^\s*(il giorno|on)\b/i;
const CHIUSURA = /(ha scritto|wrote|escribió|a écrit)\s*:\s*$/i;

/** Separatori espliciti: si riconoscono da soli, senza conferma. */
const SEPARATORE =
  /^\s*-{2,}\s*(messaggio originale|original message|forwarded message|messaggio inoltrato)\s*-{2,}\s*$/i;

/** Intestazione ricopiata in stile Outlook. `Da:` da solo non basta — può
 *  essere l'inizio di una frase — quindi serve un'altra riga d'intestazione
 *  subito sotto. */
const DA = /^\s*(da|from)\s*:\s*\S/i;
const ALTRA_INTESTAZIONE = /^\s*(inviato|sent|a|to|cc|ccn|bcc|oggetto|subject|data|date)\s*:/i;

/** L'indice della riga in cui comincia l'attribuzione, o `null`. */
function indiceAttribuzione(righe: string[]): number | null {
  for (let i = 0; i < righe.length; i++) {
    if (SEPARATORE.test(righe[i]!)) return i;

    if (APERTURA.test(righe[i]!)) {
      const fine = Math.min(righe.length, i + RIGHE_ATTRIBUZIONE);
      for (let j = i; j < fine; j++) {
        if (CHIUSURA.test(righe[j]!)) return i;
      }
    }

    if (DA.test(righe[i]!) && i + 1 < righe.length && ALTRA_INTESTAZIONE.test(righe[i + 1]!)) {
      return i;
    }
  }
  return null;
}

/** L'indice della prima riga marcata `>`, ma solo se da lì in poi non c'è più
 *  testo nuovo.
 *
 *  La cautela serve per chi risponde DENTRO la citazione, punto per punto:
 *  tagliare al primo `>` butterebbe via proprio le risposte. In quel caso è
 *  meglio non tagliare niente e lasciar leggere tutto. */
function indiceBloccoCitato(righe: string[]): number | null {
  const primo = righe.findIndex((r) => r.startsWith('>'));
  if (primo === -1) return null;
  const daLiInPoiSoloCitazione = righe
    .slice(primo)
    .every((r) => r.startsWith('>') || r.trim() === '');
  return daLiInPoiSoloCitazione ? primo : null;
}

/**
 * Divide il corpo di una risposta fra quello che è stato scritto ora e la mail
 * precedente ricopiata sotto.
 *
 * Pura e senza stato: la stessa risposta si divide sempre allo stesso modo, e
 * il testo di partenza non viene mai modificato.
 *
 * Quando il taglio non lascerebbe niente da leggere — succede a chi scrive
 * SOTTO la citazione invece che sopra — restituisce il testo intero e nessuna
 * citazione: una risposta vuota è peggio di una risposta lunga.
 */
export function separaCitazione(testo: string): CorpoRisposta {
  const righe = testo.split('\n');
  const candidati = [indiceAttribuzione(righe), indiceBloccoCitato(righe)].filter(
    (i): i is number => i !== null,
  );
  if (candidati.length === 0) return { nuovo: testo, citato: '' };

  const taglio = Math.min(...candidati);
  const nuovo = righe.slice(0, taglio).join('\n').replace(/\s+$/, '');
  if (nuovo.trim() === '') return { nuovo: testo, citato: '' };

  return { nuovo, citato: righe.slice(taglio).join('\n').trim() };
}
