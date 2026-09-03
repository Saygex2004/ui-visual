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
  /** The installation-wide Slack member ID (e.g. `U01234ABC`), from the
   *  environment. Used when a pratica names nobody mentionable. A display
   *  name does not work: `@mario` typed into text renders as literal
   *  characters and notifies nobody.
   *
   *  Who to mention for ONE message is a separate argument to `notify` —
   *  configuration and per-message choice are different things and were
   *  briefly conflated here. */
  mentionId?: string;
  /** Public origin of the dashboard, used to build the deep link. Absent =
   *  no link in the message rather than a broken relative one. */
  baseUrl?: string;
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

/** `2026-08-25` → `25/08/2026`. The stored form is ISO; nobody reading a
 *  Slack message wants to parse that, and the rest of the product already
 *  speaks Italian dates. */
function data(iso: string | null): string | null {
  if (iso == null) return null;
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function euro(cent: number | null): string | null {
  if (cent == null) return null;
  return `€ ${(cent / 100).toFixed(2).replace('.', ',')}`;
}

function riga(label: string, value: string | null): string | null {
  return value == null || value === '' ? null : `*${label}:* ${esc(value)}`;
}

export type Evento = { kind: 'creata' } | { kind: 'stato'; precedente: StatoPratica };

/**
 * The message text for one event. Pure: no network, no config lookup, so what
 * Slack will receive is assertable in a unit test.
 */
export function buildMessage(
  pratica: Pratica,
  evento: Evento,
  mentionIds?: string[],
  baseUrl?: string,
): string {
  // One `<@ID>` each: Slack notifies per mention, so a list joined into a
  // single token would render as text and ping nobody.
  const mention = mentionIds?.length ? `${mentionIds.map((id) => `<@${id}>`).join(' ')} ` : '';
  const titolo =
    evento.kind === 'creata'
      ? `${mention}📄 *Nuova pratica cartacea* — NDG ${esc(pratica.ndg.join(', '))}`
      : `${mention}📦 *Pratica ${esc(pratica.numero_pratica)}* — ` +
        `${STATO_LABEL[evento.precedente]} → *${STATO_LABEL[pratica.stato]}*`;

  const dettagli = [
    // Joined: an order can cover several positions, and the message has to
    // name all of them — that is the point of ordering them together.
    riga('NDG', pratica.ndg.join(', ')),
    riga('Numero pratica', pratica.numero_pratica),
    riga('Portafoglio', pratica.portafoglio),
    evento.kind === 'creata' ? riga('Stato', STATO_LABEL[pratica.stato]) : null,
    riga('Scatole', pratica.n_scatole),
    riga('Richiesta il', data(pratica.data_richiesta)),
    riga('Spedita il', data(pratica.data_spedizione)),
    riga('Consegna prevista', data(pratica.data_consegna_prevista)),
    riga('Consegna effettiva', data(pratica.data_consegna_effettiva)),
    riga('Costo spedizione', euro(pratica.costo_spedizione_cent)),
    riga('Note', pratica.note),
  ].filter((r): r is string => r !== null);

  // `<url|text>` is Slack's link syntax; a bare URL would render as the raw
  // address. Points at the pratica itself, not the list — the window has its
  // own address precisely so this link can exist.
  const link = baseUrl
    ? `<${baseUrl.replace(/\/$/, '')}/pratiche?pratica=${encodeURIComponent(pratica.id)}|Apri la pratica →>`
    : null;

  return [titolo, ...dettagli, ...(link ? ['', link] : [])].join('\n');
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
  /** Resolved by the caller from the chosen accounts. Omitted = fall back to
   *  the configured one. */
  mentionIds?: string[],
): Promise<void> {
  if (!config.webhookUrl) return; // not configured = off, not an error
  try {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: buildMessage(
          pratica,
          evento,
          mentionIds ?? (config.mentionId ? [config.mentionId] : []),
          config.baseUrl,
        ),
      }),
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
