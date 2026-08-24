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

/** `2026-08-21` → `21/08/2026`, and '' when absent. Italian order because
 *  that is how these dates are written and read here — and because Excel
 *  under an it-IT locale parses dd/mm/yyyy as a real date, while an ISO string
 *  often lands as text and stops sorting. Kept local rather than reusing the
 *  table formatter, which returns "N/D" for absent — fine on screen, wrong in
 *  a spreadsheet cell. */
export function csvDate(iso: string | null): string {
  if (iso == null) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

// ---- CSV ----

const SEP = ';';

function csvCell(value: string): string {
  // Excel treats a leading =, +, - or @ as a formula. Prefixing with an
  // apostrophe keeps the cell text, which matters because these are
  // identifiers people paste back into other systems.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /["\n\r;]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export const CSV_HEADERS = [
  'NDG',
  'Numero pratica',
  'Portafoglio',
  'Stato',
  'N. scatole',
  'Data richiesta',
  'Data spedizione',
  'Consegna prevista',
  'Consegna effettiva',
  'Costo spedizione',
  'Note',
  'Ordinata da',
  'Creata il',
] as const;

/**
 * CSV for Italian Excel: semicolon-separated (what Excel expects under an
 * it-IT locale — a comma lands every row in one cell) and prefixed with a
 * UTF-8 BOM, without which Excel reads the file as Latin-1 and turns every
 * accented character into mojibake. `statoLabel` is injected so the file
 * carries the same words the screen does, without this module importing i18n.
 */
export function praticheToCsv(
  pratiche: Pratica[],
  nomeUtente: (id: string | null) => string = () => '',
  statoLabel: (s: StatoPratica) => string = (s) => s,
): string {
  const rows = pratiche.map((p) =>
    [
      p.ndg,
      p.numero_pratica,
      p.portafoglio ?? '',
      statoLabel(p.stato),
      p.n_scatole ?? '',
      csvDate(p.data_richiesta),
      csvDate(p.data_spedizione),
      csvDate(p.data_consegna_prevista),
      csvDate(p.data_consegna_effettiva),
      formatEuro(p.costo_spedizione_cent),
      p.note ?? '',
      nomeUtente(p.ordinato_da),
      p.created_at,
    ]
      .map(csvCell)
      .join(SEP),
  );
  return `\uFEFF${[CSV_HEADERS.join(SEP), ...rows].join('\r\n')}\r\n`;
}

/** `pratiche-2026-08-24.csv` — dated so successive exports don't overwrite
 *  each other in the Downloads folder. */
export function csvFilename(today: Date): string {
  return `pratiche-${today.toISOString().slice(0, 10)}.csv`;
}
