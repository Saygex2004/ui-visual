// Pure filtering, money formatting and CSV building for the pratiche
// register. No React, no I/O: the export must produce exactly the rows the
// table is showing, and keeping both derived from the same function is what
// guarantees that.
import type { Pratica, StatoPratica } from '@pvp/shared';

export interface PraticheFilters {
  /** Free text, matched across every human-readable field. */
  q: string;
  /** Exact portfolio, or '' for all. */
  portafoglio: string;
  /** A specific stage, or '' for all. */
  stato: StatoPratica | '';
}

export const EMPTY_FILTERS: PraticheFilters = {
  q: '',
  portafoglio: '',
  stato: '',
};

// ---- money ----

/** Cents → "12,50". Italian decimal comma, always two digits: a cost shown as
 *  "12,5" reads as a typo on an invoice line. */
export function formatEuro(cent: number | null): string {
  if (cent == null) return '';
  return (cent / 100).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "12,50" | "12.50" | "€ 12,50" → 1250 cents; null for anything that isn't a
 *  usable amount. Accepts both separators because an operator typing on a
 *  numeric keypad gets a dot and one typing prose gets a comma, and refusing
 *  either would just look broken. Rounds rather than truncates so 0.005 does
 *  not silently vanish. */
export function parseEuro(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// ---- filtering ----

function haystack(p: Pratica, nomeUtente: (id: string | null) => string): string {
  return [p.ndg, p.numero_pratica, p.portafoglio, p.note, p.n_scatole, nomeUtente(p.ordinato_da)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** The one definition of "which rows are showing". The table renders this and
 *  the CSV exports this — never two separate notions of the current view. */
export function filterPratiche(
  pratiche: Pratica[],
  filters: PraticheFilters,
  nomeUtente: (id: string | null) => string = () => '',
): Pratica[] {
  const needle = filters.q.trim().toLowerCase();
  return pratiche.filter((p) => {
    if (filters.portafoglio && (p.portafoglio ?? '') !== filters.portafoglio) return false;
    if (filters.stato && p.stato !== filters.stato) return false;
    if (needle && !haystack(p, nomeUtente).includes(needle)) return false;
    return true;
  });
}

/** Distinct portfolios present in the data, sorted — the filter's options.
 *  Derived rather than configured, so a portfolio typed today is filterable
 *  today without anyone maintaining a list. */
export function portafogliPresenti(pratiche: Pratica[]): string[] {
  return [
    ...new Set(pratiche.map((p) => p.portafoglio).filter((v): v is string => Boolean(v))),
  ].sort((a, b) => a.localeCompare(b, 'it'));
}

/** True when the file is late: it was expected by now and has not arrived.
 *  Pure and date-injected rather than reading the clock, so the rule is
 *  testable and the caller decides what "now" means. */
export function inRitardo(p: Pratica, oggi: string): boolean {
  return (
    p.data_consegna_prevista != null &&
    p.data_consegna_effettiva == null &&
    p.data_consegna_prevista < oggi
  );
}
