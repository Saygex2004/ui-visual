// Pure filter + sort over one table's rows (UI §4.2), driven entirely by the
// URL state (urlState.ts) — the toolbar, the live count, and the table all
// read the SAME derived result, never their own local state. AND-composition
// of every active filter, including the cluster-wide geographic selection
// (UI §3.2). `includeGeo: false` (Archivio, UI §9.1) skips regione/capoluogo/
// provincia — the archive mixes clusters/regions and lists no geographic
// filter of its own.
import { compareValore, compareData, compareBloccoKey, type ListingRow } from '@pvp/shared';
import type { AreaSearch, SortKey } from './urlState.js';

const COMPARATORS: Record<SortKey, (a: ListingRow, b: ListingRow) => number> = {
  blocco: (a, b) => compareBloccoKey(a.blocco_key, b.blocco_key),
  valore: (a, b) => compareValore(a.valore_richiesto, b.valore_richiesto),
  pubblicazione: (a, b) => compareData(a.data_pubblicazione, b.data_pubblicazione),
  vendita: (a, b) => compareData(a.data_vendita, b.data_vendita),
};

function matchesFreeText(row: ListingRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return true;
  const haystack = [
    row.tipo_bene,
    row.tipo_procedura,
    row.disponibilita,
    row.numero,
    row.anno,
    row.tribunale,
    row.regione,
    row.provincia,
    row.comune,
    row.descrizione_excerpt,
  ];
  return haystack.some((field) => field != null && field.toLowerCase().includes(needle));
}

export interface FilterResult<T extends ListingRow> {
  rows: T[];
  visibleCount: number;
  totalCount: number;
}

/** Filter + sort one bucket's/archive's rows against the URL search state.
 *  `T` covers both `ListingRow` and `ArchiveRow` (a strict superset). */
export function applyFilterModel<T extends ListingRow>(
  rows: readonly T[],
  search: AreaSearch,
  opts?: { includeGeo?: boolean },
): FilterResult<T> {
  const includeGeo = opts?.includeGeo ?? true;
  let result = rows.filter((row) => {
    if (search.q && !matchesFreeText(row, search.q)) return false;
    if (search.tipo && row.tipo_bene !== search.tipo) return false;
    if (search.procedura && row.tipo_procedura !== search.procedura) return false;
    if (search.disponibilita && row.disponibilita !== search.disponibilita) return false;
    if (search.tribunale && row.tribunale !== search.tribunale) return false;
    // A numeric bound can't be evaluated against an unknown value — a row
    // with no valore_richiesto never matches an active min/max filter (its
    // value literally isn't known to be "in range").
    if (search.min != null && (row.valore_richiesto == null || row.valore_richiesto < search.min)) {
      return false;
    }
    if (search.max != null && (row.valore_richiesto == null || row.valore_richiesto > search.max)) {
      return false;
    }
    if (search.blocco && row.blocco_key !== search.blocco) return false;
    if (includeGeo) {
      if (search.regione && row.regione !== search.regione) return false;
      // Mutually exclusive by construction (DrillDown never sets both), but
      // each is still applied independently so a hand-edited URL with both
      // set is simply the AND of the two rather than undefined behaviour.
      if (search.capoluogo && row.comune !== search.capoluogo) return false;
      if (search.provincia && row.provincia !== search.provincia) return false;
    }
    return true;
  });

  if (search.sort) {
    const compare = COMPARATORS[search.sort];
    const sign = search.dir === 'desc' ? -1 : 1;
    result = [...result].sort((a, b) => sign * compare(a, b));
  }

  return { rows: result, visibleCount: result.length, totalCount: rows.length };
}

/** Distinct, non-null values of one field actually present in `rows` — feeds
 *  the toolbar's column choosers (UI §4.2: "populated with the distinct
 *  values actually present in that table"), sorted for a stable menu order. */
export function distinctValues<T extends ListingRow, K extends keyof ListingRow>(
  rows: readonly T[],
  field: K,
): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === 'string' && value.length > 0) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'it'));
}
