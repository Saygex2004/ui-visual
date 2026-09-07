// The companies actually on offer: the ones shipped in code, plus the ones an
// administrator has added.
//
// One function, used everywhere a company is chosen, so the sender menu, the
// recipient auto-fill and the preview cannot end up with different lists.
import type { CartaAzienda } from '@pvp/shared';
import { AZIENDE, type Azienda } from '../data/aziende.js';

/** An added company, in the shape the form and the document already speak.
 *
 *  The stored record uses snake_case (it is a Firestore document); the
 *  letterhead code has spoken the shipped shape since it was ported. Rather
 *  than rename one of them, the translation lives here — in one place, where
 *  it is visible. */
export function daRecord(a: CartaAzienda): Azienda {
  return {
    id: a.id,
    nome: a.nome,
    // Empty means "print nothing across the top" — the same way the shipped
    // blank template expresses it. That is a deliberate choice on the record,
    // not a missing value: some letterheads carry their identity only in the
    // footer, or are printed on paper that already has it.
    nomeHeader: a.stampa_nome_intestazione ? (a.nome_header ?? a.nome) : '',
    sottotitolo: a.sottotitolo ?? undefined,
    logo: a.logo,
    logoWidth: a.logo_width ?? undefined,
    logoHeight: a.logo_height ?? undefined,
    via: a.via ?? undefined,
    cap: a.cap ?? undefined,
    citta: a.citta ?? undefined,
    pec: a.pec ?? undefined,
    email: a.email ?? undefined,
    footerText: a.footer_text ?? undefined,
    cf: a.cf ?? undefined,
    cittaData: a.citta_data ?? undefined,
    headerColor: a.header_color ?? undefined,
    headerSize: a.header_size ?? undefined,
  };
}

/** Everything that can be written TO. Added companies are commonly added for
 *  exactly this: their address and PEC are what is wanted. */
export function aziendeDestinatarie(custom: CartaAzienda[]): Azienda[] {
  return [...AZIENDE, ...custom.map(daRecord)];
}

/** Everything that can be written FROM. An added company is offered here only
 *  when it was marked as usable as a sender — a company added purely to be
 *  written to would otherwise be one more way to pick the wrong one. */
export function aziendeMittenti(custom: CartaAzienda[]): Azienda[] {
  return [...AZIENDE, ...custom.filter((a) => a.usabile_come_mittente).map(daRecord)];
}
