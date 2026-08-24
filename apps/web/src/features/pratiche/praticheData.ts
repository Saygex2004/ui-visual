// Pure filtering + CSV building for the pratiche register. No React, no I/O:
// the export must produce exactly the rows the table is showing, and keeping
// both derived from the same function is what guarantees that.
import type { Pratica } from '@pvp/shared';

export interface PraticheFilters {
  /** Free text, matched across every human-readable field. */
  q: string;
  /** Exact vehicle, or '' for all. */
  veicolo: string;
  /** 'tutte' | 'si' | 'no' — extinguished state. */
  estinto: 'tutte' | 'si' | 'no';
}

export const EMPTY_FILTERS: PraticheFilters = { q: '', veicolo: '', estinto: 'tutte' };

function haystack(p: Pratica, nomeUtente: (id: string | null) => string): string {
  return [
    p.ndg,
    p.numero_pratica,
    p.veicolo,
    p.plurima_riscontro,
    p.note,
    p.n_scatola == null ? '' : String(p.n_scatola),
    nomeUtente(p.ordinato_da),
  ]
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
    if (filters.veicolo && (p.veicolo ?? '') !== filters.veicolo) return false;
    if (filters.estinto === 'si' && !p.estinto) return false;
    if (filters.estinto === 'no' && p.estinto) return false;
    if (needle && !haystack(p, nomeUtente).includes(needle)) return false;
    return true;
  });
}

/** Distinct vehicles present in the data, sorted — the filter's options.
 *  Derived rather than configured, so a vehicle typed today is filterable
 *  today without anyone maintaining a list. */
export function veicoliPresenti(pratiche: Pratica[]): string[] {
  return [...new Set(pratiche.map((p) => p.veicolo).filter((v): v is string => Boolean(v)))].sort(
    (a, b) => a.localeCompare(b, 'it'),
  );
}

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
  'Veicolo',
  'Estinto',
  'N. scatola',
  'Plurima/Riscontro',
  'Note',
  'Ordinato da',
  'Creata il',
] as const;

/**
 * CSV for Italian Excel: semicolon-separated (what Excel expects under an
 * it-IT locale — a comma lands every row in one cell) and prefixed with a
 * UTF-8 BOM, without which Excel reads the file as Latin-1 and turns every
 * accented character into mojibake.
 */
export function praticheToCsv(
  pratiche: Pratica[],
  nomeUtente: (id: string | null) => string = () => '',
): string {
  const rows = pratiche.map((p) =>
    [
      p.ndg,
      p.numero_pratica,
      p.veicolo ?? '',
      p.estinto ? 'Sì' : 'No',
      p.n_scatola == null ? '' : String(p.n_scatola),
      p.plurima_riscontro ?? '',
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
