// Richiesta del fascicolo all'archivio, spedita alla creazione di una pratica.
//
// Il server NON parla SMTP: scrive un documento nella collezione `mail`, e
// l'estensione `firestore-send-email` lo consegna. Il vantaggio non è meno
// codice — è che l'esito finisce dentro il documento stesso (`delivery.state`,
// `delivery.error`, tentativi) invece che in una riga di log, quindi quando
// una mail non arriva si vede il perché guardando Firestore.
//
// Solo alla creazione. I cambi di stato restano su Slack, dove un flusso di
// aggiornamenti minuti ha senso; una casella che ne riceve dieci al giorno
// smette di essere letta.
import type { Firestore } from 'firebase-admin/firestore';
import type { Pratica } from '@pvp/shared';

/** Collezione sorvegliata dall'estensione. Cambiarla qui senza cambiarla
 *  nella configurazione dell'estensione significa scrivere documenti che
 *  nessuno consegnerà. */
const MAIL_COLLECTION = 'mail';

export interface EmailConfig {
  /** Destinatario principale. Assente = niente mail, che è lo stato di
   *  sviluppo locale, emulatore e test. */
  to?: string;
  /** In copia. Facoltativo. */
  cc?: string;
  /** Dove finiscono le RISPOSTE, se diverso dal mittente.
   *
   *  Va impostato perche' il mittente non e' un indirizzo utile: finche' il
   *  dominio non e' autenticato, Brevo riscrive il From su un proprio
   *  sottodominio (`@…brevosend.com`) e una risposta la' non arriverebbe a
   *  nessuno. Il Reply-To invece Brevo lo lascia intatto. */
  replyTo?: string;
}

/** La società per conto della quale si chiede il fascicolo. Fissa: le
 *  richieste all'archivio partono sempre da qui. */
const OPERAZIONE = 'DPZ NPL';

/** La tariffa citata nella richiesta. Fissa per scelta: è la tariffa
 *  ORDINARIA concordata con l'archivio, non il costo effettivo della singola
 *  spedizione — quello si registra sulla pratica ed è un'altra cosa. */
const TARIFFA = '€ 12,50';

/** Le cinque cose che romperebbero il markup se un intestatario si chiamasse
 *  `Rossi & C. <srl>`. Il nome arriva da un campo libero: non è fidato. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface Messaggio {
  subject: string;
  text: string;
  html: string;
}

/**
 * Il testo della richiesta. Puro: nessuna rete, nessuna lettura di
 * configurazione, quindi ciò che l'archivio riceverà è verificabile in un
 * unit test.
 *
 * Le righe dei dati compaiono solo se il dato c'è: `Intestatario:` seguito dal
 * nulla, in una richiesta che qualcuno legge e su cui deve agire, è peggio
 * della riga assente.
 */
export function buildRichiesta(pratica: Pratica): Messaggio {
  const ndg = pratica.ndg.join(', ');
  const righe: [string, string | null][] = [
    ['Intestatario', pratica.intestatario],
    ['NDG', ndg],
    [
      'Riferimento operazione',
      pratica.portafoglio ? `Cessione ${pratica.portafoglio} / ${OPERAZIONE}` : null,
    ],
  ];
  const presenti = righe.filter((r): r is [string, string] => Boolean(r[1]));

  // L'oggetto nomina la posizione, perché il corpo dice "la posizione in
  // oggetto" e deve esserci davvero qualcosa a cui quel rimando punti.
  const posizione = pratica.intestatario ? `${pratica.intestatario} (NDG ${ndg})` : `NDG ${ndg}`;
  const subject = `Richiesta fascicolo cartaceo — ${posizione}`;

  const apertura = 'Ciao Eugenia,';
  const introduzione = 'avremmo bisogno del fascicolo cartaceo relativo alla posizione in oggetto:';
  const spedizione =
    'Vi chiediamo di organizzare la spedizione presso i nostri uffici il prima possibile, ' +
    `applicando la tariffa ordinaria di ${TARIFFA} a nostro carico.`;
  const attesa = 'Restiamo in attesa di un vostro riscontro.';
  const saluto = 'Grazie mille,';

  const text = [
    apertura,
    '',
    introduzione,
    '',
    ...presenti.map(([k, v]) => `${k}: ${v}`),
    '',
    spedizione,
    '',
    attesa,
    '',
    saluto,
  ].join('\n');

  // HTML volutamente povero e con stili in linea: i client di posta buttano
  // via i blocchi <style> e ignorano quasi tutto il CSS moderno. Non è il
  // posto per il sistema di design.
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">',
    `<p>${esc(apertura)}</p>`,
    `<p>${esc(introduzione)}</p>`,
    '<p>',
    presenti.map(([k, v]) => `${esc(k)}: <strong>${esc(v)}</strong>`).join('<br>'),
    '</p>',
    `<p>${esc(spedizione)}</p>`,
    `<p>${esc(attesa)}</p>`,
    `<p>${esc(saluto)}</p>`,
    '</div>',
  ].join('');

  return { subject, text, html };
}

/** Inserisce l'id della pratica nell'indirizzo di risposta, con la notazione
 *  `+` che Gmail (e la maggior parte dei server) consegna alla stessa casella:
 *  `posta@gmail.com` -> `posta+VonnyY4jr@gmail.com`.
 *
 *  Serve a sapere con CERTEZZA a quale pratica appartiene una risposta. Le
 *  alternative sono peggiori: l'oggetto lo riscrive chi risponde, e gli header
 *  di conversazione qualche programma di posta li altera o li perde.
 *
 *  Un indirizzo che ha gia' un `+` viene lasciato stare: aggiungerne un
 *  secondo produrrebbe un indirizzo che non esiste. */
export function replyToPerPratica(indirizzo: string, praticaId: string): string {
  const chiocciola = indirizzo.lastIndexOf('@');
  if (chiocciola <= 0) return indirizzo;
  const locale = indirizzo.slice(0, chiocciola);
  const dominio = indirizzo.slice(chiocciola + 1);
  if (locale.includes('+')) return indirizzo;
  return `${locale}+${praticaId}@${dominio}`;
}

interface Logger {
  warn: (obj: unknown, msg?: string) => void;
}

/**
 * Accoda la richiesta, e non lancia mai. Una pratica salvata resta salvata
 * anche se la coda non è scrivibile: la notifica è una cortesia, non parte
 * della transazione — lo stesso contratto della notifica Slack.
 */
export async function sendCreationEmail(
  db: Firestore,
  config: EmailConfig,
  pratica: Pratica,
  logger: Logger,
): Promise<void> {
  if (!config.to) return; // non configurato = spento, non un errore
  try {
    const { subject, text, html } = buildRichiesta(pratica);
    await db.collection(MAIL_COLLECTION).add({
      to: [config.to],
      ...(config.cc ? { cc: [config.cc] } : {}),
      ...(config.replyTo ? { replyTo: replyToPerPratica(config.replyTo, pratica.id) } : {}),
      message: { subject, text, html },
      // Non letto dall'estensione: serve a ritrovare, dato un documento in
      // coda, la pratica che lo ha generato.
      pratica_id: pratica.id,
    });
  } catch (err) {
    logger.warn({ err }, 'accodamento della richiesta fascicolo fallito');
  }
}
