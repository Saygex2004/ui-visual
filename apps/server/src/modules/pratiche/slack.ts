// Slack notifications for the pratiche register.
//
// Posted from here, the Cloud Run server, and NOT from a Cloud Function: no
// Functions anywhere in this project is a standing cost constraint, and the
// write already happens in this process, so this is where the fact is known.
//
// Note this is unrelated to the Slack integration in the Firebase console —
// that one reports platform events (budget, crash, release alerts) and knows
// nothing about application data. This is an Incoming Webhook of our own.
import type { Pratica, StatoPratica } from '@pvp/shared';

export interface SlackConfig {
  /** Incoming Webhook URL. Absent = notifications off, which is the correct
   *  state for local development and the emulator. */
  webhookUrl?: string;
  /** Slack member ID (e.g. `U01234ABC`) to mention. A display name does not
   *  work: `@mario` typed into text renders as literal characters and
   *  notifies nobody. */
  mentionId?: string;
}

/** Slack mrkdwn reserves exactly these three; everything else is literal.
 *  Notes are free text, so a debtor called "Rossi & C. <srl>" would otherwise
 *  arrive mangled or swallow the rest of the line. */
function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const STATO_LABEL: Record<StatoPratica, string> = {
  richiesto: 'Richiesto',
  estratto: 'Estratto',
  spedito: 'Spedito',
  consegnato: 'Consegnato',
  archiviato: 'Archiviato / rientrato',
};

function euro(cent: number | null): string | null {
  if (cent == null) return null;
  return `€ ${(cent / 100).toFixed(2).replace('.', ',')}`;
}

function riga(label: string, value: string | null): string | null {
  return value == null || value === '' ? null : `*${label}:* ${esc(value)}`;
}

export type Evento = { kind: 'creata' } | { kind: 'stato'; precedente: StatoPratica };

/**
 * The message text for one event. Pure: no network, no config lookup beyond
 * the mention, so what Slack will receive is assertable in a unit test.
 */
export function buildMessage(pratica: Pratica, evento: Evento, mentionId?: string): string {
  const mention = mentionId ? `<@${mentionId}> ` : '';
  const titolo =
    evento.kind === 'creata'
      ? `${mention}📄 *Nuova pratica cartacea* — NDG ${esc(pratica.ndg)}`
      : `${mention}📦 *Pratica ${esc(pratica.numero_pratica)}* — ` +
        `${STATO_LABEL[evento.precedente]} → *${STATO_LABEL[pratica.stato]}*`;

  const dettagli = [
    riga('NDG', pratica.ndg),
    riga('Numero pratica', pratica.numero_pratica),
    riga('Portafoglio', pratica.portafoglio),
    evento.kind === 'creata' ? riga('Stato', STATO_LABEL[pratica.stato]) : null,
    riga('Scatole', pratica.n_scatole),
    riga('Spedita il', pratica.data_spedizione),
    riga('Consegna prevista', pratica.data_consegna_prevista),
    riga('Consegna effettiva', pratica.data_consegna_effettiva),
    riga('Costo spedizione', euro(pratica.costo_spedizione_cent)),
    riga('Note', pratica.note),
  ].filter((r): r is string => r !== null);

  return [titolo, ...dettagli].join('\n');
}

interface Logger {
  warn: (obj: unknown, msg?: string) => void;
}

/**
 * Posts, and never throws. A pratica that was saved must stay saved even if
 * Slack is down, misconfigured or slow — the notification is a courtesy, not
 * part of the transaction. Failures are logged and swallowed on purpose.
 */
export async function notify(
  config: SlackConfig,
  pratica: Pratica,
  evento: Evento,
  logger: Logger,
): Promise<void> {
  if (!config.webhookUrl) return; // not configured = off, not an error
  try {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildMessage(pratica, evento, config.mentionId) }),
      // Slack is not on the critical path; a hung webhook must not hold a
      // request open behind it.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'slack notification refused');
    }
  } catch (err) {
    logger.warn({ err }, 'slack notification failed');
  }
}
