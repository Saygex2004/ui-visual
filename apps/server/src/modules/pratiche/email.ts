// Email notification for a newly created pratica.
//
// Sent from here, the Cloud Run server, and NOT from a Cloud Function or a
// Firebase Extension: no Functions anywhere in this project is a standing cost
// constraint, and the "Trigger Email from Firestore" extension would buy us
// nothing anyway — it does not send mail itself, it drives an SMTP server just
// like this does, while adding the very runtime we are avoiding.
//
// Creation only. State changes go to Slack, where a stream of small updates
// belongs; a mailbox that receives ten of those a day is a mailbox nobody
// reads by the end of the week.
import nodemailer, { type Transporter } from 'nodemailer';
import type { Pratica } from '@pvp/shared';

export interface EmailConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  /** Implicit TLS. Derived from the port when not set: 465 is implicit,
   *  everything else starts plain and upgrades with STARTTLS. */
  secure?: boolean;
  from?: string;
  to?: string;
  /** Public origin of the dashboard, for the link. Absent = no link rather
   *  than a broken relative one. */
  baseUrl?: string;
}

/** Everything needed to actually send. Anything missing means the feature is
 *  off — deliberately not an error: this ships before the credentials exist,
 *  and local development and the emulator never have them. */
export function configurato(
  c: EmailConfig,
): c is EmailConfig & { host: string; from: string; to: string } {
  return Boolean(c.host && c.from && c.to);
}

const STATO_LABEL: Record<Pratica['stato'], string> = {
  richiesto: 'Richiesto',
  estratto: 'Estratto',
  spedito: 'Spedito',
  consegnato: 'Consegnato',
  archiviato: 'Archiviato / rientrato',
  non_trovato: 'Non trovato',
};

/** The five characters that would otherwise let a debtor called
 *  `Rossi & C. <srl>` break the markup — or inject some of their own. Notes
 *  and portfolio names are free text typed by hand, so none of it is trusted. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `2026-08-25` → `25/08/2026`. The stored form is ISO; nobody reading a
 *  message wants to parse that, and the rest of the product speaks Italian
 *  dates. */
function data(iso: string | null): string | null {
  if (iso == null) return null;
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function euro(cent: number | null): string | null {
  return cent == null ? null : `€ ${(cent / 100).toFixed(2).replace('.', ',')}`;
}

export interface Messaggio {
  subject: string;
  text: string;
  html: string;
}

/**
 * The message for one created pratica. Pure: no network, no config lookup, so
 * what will actually be sent is assertable in a unit test.
 *
 * Both parts are built, and that is not belt-and-braces: a text/plain
 * alternative is what keeps the message out of the spam folder for several
 * filters, and it is what someone reading on a watch or in a terminal client
 * actually sees.
 */
export function buildEmail(pratica: Pratica, baseUrl?: string): Messaggio {
  const ndg = pratica.ndg.join(', ');
  const righe: [string, string | null][] = [
    ['NDG', ndg],
    ['Numero pratica', pratica.numero_pratica],
    ['Portafoglio', pratica.portafoglio],
    ['Stato', STATO_LABEL[pratica.stato]],
    ['Scatole', pratica.n_scatole],
    ['Richiesta il', data(pratica.data_richiesta)],
    ['Consegna prevista', data(pratica.data_consegna_prevista)],
    ['Costo spedizione', euro(pratica.costo_spedizione_cent)],
    ['Note', pratica.note],
  ];
  const presenti = righe.filter((r): r is [string, string] => r[1] != null && r[1] !== '');

  const link = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/pratiche?pratica=${encodeURIComponent(pratica.id)}`
    : null;

  const subject = `Nuova pratica cartacea — NDG ${ndg}`;

  const text = [
    subject,
    '',
    ...presenti.map(([k, v]) => `${k}: ${v}`),
    ...(link ? ['', `Apri la pratica: ${link}`] : []),
  ].join('\n');

  // Deliberately plain, inline-styled HTML with a table: email clients strip
  // <style> blocks, ignore most modern CSS, and several still lay out with
  // tables. This is not the place for the design system.
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">',
    `<p style="margin:0 0 12px"><strong>${esc(subject)}</strong></p>`,
    '<table cellpadding="4" cellspacing="0" style="border-collapse:collapse">',
    ...presenti.map(
      ([k, v]) =>
        `<tr><td style="color:#555;padding-right:12px">${esc(k)}</td>` +
        `<td><strong>${esc(v)}</strong></td></tr>`,
    ),
    '</table>',
    ...(link
      ? [`<p style="margin:16px 0 0"><a href="${esc(link)}">Apri la pratica &rarr;</a></p>`]
      : []),
    '</div>',
  ].join('');

  return { subject, text, html };
}

interface Logger {
  warn: (obj: unknown, msg?: string) => void;
}

/** Built once per process, not per message: an SMTP handshake costs a round
 *  trip, and this server serves many requests from one warm instance. */
let transporter: Transporter | null = null;

function trasporto(c: EmailConfig & { host: string }): Transporter {
  if (transporter) return transporter;
  const port = c.port ?? 587;
  transporter = nodemailer.createTransport({
    host: c.host,
    port,
    // 465 is implicit TLS; 587/25 start plain and upgrade. Getting these two
    // out of step is the classic way an SMTP setup fails with a message that
    // explains nothing.
    secure: c.secure ?? port === 465,
    auth: c.user && c.password ? { user: c.user, pass: c.password } : undefined,
    // The notification is a courtesy, not part of the transaction: it must
    // never hold a request open behind a server that has stopped answering.
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 5_000,
  });
  return transporter;
}

/** Test seam: drops the memoised transport so a stubbed one is picked up. */
export function _resetTransport(): void {
  transporter = null;
}

/**
 * Sends, and never throws. A pratica that was saved must stay saved even if
 * the mail server is down, misconfigured or slow — exactly the contract the
 * Slack notification has, and for the same reason.
 */
export async function sendCreationEmail(
  config: EmailConfig,
  pratica: Pratica,
  logger: Logger,
): Promise<void> {
  if (!configurato(config)) return; // not configured = off, not an error
  try {
    const { subject, text, html } = buildEmail(pratica, config.baseUrl);
    await trasporto(config).sendMail({
      from: config.from,
      to: config.to,
      subject,
      text,
      html,
    });
  } catch (err) {
    logger.warn({ err }, 'pratica creation email failed');
  }
}
