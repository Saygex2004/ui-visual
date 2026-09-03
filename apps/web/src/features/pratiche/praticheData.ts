// Pure filtering, money formatting and CSV building for the pratiche
// register. No React, no I/O: the export must produce exactly the rows the
// table is showing, and keeping both derived from the same function is what
// guarantees that.
import type { Pratica, StatoPratica } from '@pvp/shared';

/** The dates a pratica carries, and which the month filter can be applied to.
 *  Four of them, because "what happened in March" means a different thing to
 *  whoever ordered the file and to whoever is chasing a courier. */
export const CAMPI_DATA = [
  'data_richiesta',
  'data_spedizione',
  'data_consegna_prevista',
  'data_consegna_effettiva',
] as const;
export type CampoData = (typeof CAMPI_DATA)[number];

export interface PraticheFilters {
  /** Free text, matched across every human-readable field. */
  q: string;
  /** Exact portfolio, or '' for all. */
  portafoglio: string;
  /** A specific stage, or '' for all. */
  stato: StatoPratica | '';
  /** Which date the month applies to. */
  campoData: CampoData;
  /** 'YYYY-MM', or '' for every month. */
  mese: string;
}

export const EMPTY_FILTERS: PraticheFilters = {
  q: '',
  portafoglio: '',
  stato: '',
  campoData: 'data_richiesta',
  mese: '',
};

/** The NDGs as one readable string. One definition, used by the table, the
 *  window and the export, so the three cannot disagree about the separator. */
export function ndgTesto(ndg: string[]): string {
  return ndg.join(', ');
}

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
  return [...p.ndg, p.numero_pratica, p.portafoglio, p.note, p.n_scatole, nomeUtente(p.ordinato_da)]
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
    // Dates are stored as 'YYYY-MM-DD', so the month is a prefix — no parsing,
    // no time zone, and a pratica with that date simply absent drops out
    // rather than being counted into whichever month happens to be selected.
    if (filters.mese && !(p[filters.campoData] ?? '').startsWith(filters.mese)) return false;
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

/** The months present in the data for one date field, newest first — the
 *  filter's options. Derived rather than a calendar of every month since the
 *  epoch: offering a month with nothing in it is an invitation to conclude,
 *  wrongly, that something was lost. */
export function mesiPresenti(pratiche: Pratica[], campo: CampoData): string[] {
  const mesi = pratiche
    .map((p) => p[campo])
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 7));
  return [...new Set(mesi)].sort().reverse();
}

/** '2026-03' → 'marzo 2026'. Built from the first of the month, which always
 *  exists — 'YYYY-MM' alone parses as UTC and can slip to the month before in
 *  a negative offset. */
export function etichettaMese(mese: string): string {
  const [anno, m] = mese.split('-');
  if (!anno || !m) return mese;
  const d = new Date(Number(anno), Number(m) - 1, 1);
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}
