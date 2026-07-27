// Geographic drill-down — pure helpers (UI §3.2). Every list is built from the
// CLUSTER's own rows (both buckets, unfiltered), never a static reference
// table — same principle as `isCapitalComune` (DOMAIN_RULES.md §9: "the
// drill-down already knows the capitals present").
import { isCapitalComune, type ListingRow } from '@pvp/shared';

const itCollator = (a: string, b: string) => a.localeCompare(b, 'it');

function distinct(values: Iterable<string | null>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v != null && v.length > 0) set.add(v);
  }
  return [...set].sort(itCollator);
}

/** Distinct regions present across the whole cluster (both buckets). */
export function regionsPresent(rows: readonly ListingRow[]): string[] {
  return distinct(rows.map((r) => r.regione));
}

/** The subset of rows belonging to one region. */
export function rowsForRegion<T extends { regione: string | null }>(
  rows: readonly T[],
  regione: string,
): T[] {
  return rows.filter((row) => row.regione === regione);
}

/** Distinct capital comuni present among the given (region-scoped) rows, each
 *  identified from the rows themselves — never a hardcoded province table. */
export function capitalsPresent(rows: readonly ListingRow[]): string[] {
  return distinct(rows.filter(isCapitalComune).map((r) => r.comune));
}

/** Distinct provinces present among the given (region-scoped) rows. */
export function provincesPresent(rows: readonly ListingRow[]): string[] {
  return distinct(rows.map((r) => r.provincia));
}

/** The capital comune for a province, from the rows actually present
 *  (DOMAIN_RULES.md §9). `null` when no active listing sits at that
 *  province's capital in the current cluster — the OMI panel then reports
 *  "not available" rather than guessing a comune name. */
export function capitalComuneForProvince(
  rows: readonly ListingRow[],
  provincia: string,
): string | null {
  const capital = rows.find((row) => row.provincia === provincia && isCapitalComune(row));
  return capital?.comune ?? null;
}
